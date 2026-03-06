const crypto = require('node:crypto');

const memoryStore = globalThis.__shareSnapshotStore ?? new Map();
globalThis.__shareSnapshotStore = memoryStore;

const getTableName = () => {
  return process.env.SHARE_SNAPSHOTS_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || '';
};

const getOwnerIndexName = () => {
  return process.env.SHARE_OWNER_INDEX_NAME || 'ownerUserIdHash-createdAt-index';
};

let cachedDocClient = null;

const getDynamoDocClient = () => {
  if (cachedDocClient) {
    return cachedDocClient;
  }

  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

  const client = new DynamoDBClient({});
  cachedDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });

  return cachedDocClient;
};

const deriveKey = () => {
  const configured = process.env.SHARE_ENCRYPTION_KEY || 'marginbase-dev-share-key';
  return crypto.createHash('sha256').update(configured).digest();
};

const encryptSnapshot = (snapshot) => {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(snapshot), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

const decryptSnapshot = (encryptedBlob) => {
  const payload = Buffer.from(String(encryptedBlob), 'base64');
  if (payload.length < 29) {
    throw new Error('Encrypted payload is invalid.');
  }

  const key = deriveKey();
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
};

const putSnapshotRecord = async (record) => {
  if (typeof globalThis.__sharePut === 'function') {
    await globalThis.__sharePut({
      tableName: getTableName(),
      record
    });
    return;
  }

  const tableName = getTableName();
  if (tableName) {
    const client = getDynamoDocClient();
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');

    await client.send(new PutCommand({
      TableName: tableName,
      Item: record
    }));
    return;
  }

  memoryStore.set(record.pk, record);
};

const getSnapshotRecord = async (token) => {
  if (typeof globalThis.__shareGet === 'function') {
    return globalThis.__shareGet({
      tableName: getTableName(),
      token
    });
  }

  const tableName = getTableName();
  if (tableName) {
    const client = getDynamoDocClient();
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');

    const output = await client.send(new GetCommand({
      TableName: tableName,
      Key: {
        pk: token
      }
    }));

    return output.Item ?? null;
  }

  return memoryStore.get(token) ?? null;
};

const listSnapshotRecordsByOwner = async (ownerUserIdHash) => {
  if (typeof globalThis.__shareList === 'function') {
    return globalThis.__shareList({
      tableName: getTableName(),
      ownerUserIdHash
    });
  }

  const tableName = getTableName();
  if (tableName) {
    const client = getDynamoDocClient();
    const { QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

    try {
      const output = await client.send(new QueryCommand({
        TableName: tableName,
        IndexName: getOwnerIndexName(),
        KeyConditionExpression: 'ownerUserIdHash = :owner',
        ExpressionAttributeValues: {
          ':owner': ownerUserIdHash
        },
        ScanIndexForward: false,
        Limit: 100
      }));

      return Array.isArray(output.Items) ? output.Items : [];
    } catch {
      const fallback = await client.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'ownerUserIdHash = :owner',
        ExpressionAttributeValues: {
          ':owner': ownerUserIdHash
        },
        Limit: 100
      }));

      return Array.isArray(fallback.Items) ? fallback.Items : [];
    }
  }

  const records = [];
  for (const value of memoryStore.values()) {
    if (value?.ownerUserIdHash === ownerUserIdHash) {
      records.push(value);
    }
  }

  return records;
};

const deleteSnapshotRecord = async (token) => {
  if (typeof globalThis.__shareDelete === 'function') {
    return globalThis.__shareDelete({
      tableName: getTableName(),
      token
    });
  }

  const tableName = getTableName();
  if (tableName) {
    const client = getDynamoDocClient();
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');

    const output = await client.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: token
      },
      ReturnValues: 'ALL_OLD'
    }));

    return Boolean(output.Attributes);
  }

  return memoryStore.delete(token);
};

exports.encryptSnapshot = encryptSnapshot;
exports.decryptSnapshot = decryptSnapshot;
exports.putSnapshotRecord = putSnapshotRecord;
exports.getSnapshotRecord = getSnapshotRecord;
exports.deleteSnapshotRecord = deleteSnapshotRecord;
exports.listSnapshotRecordsByOwner = listSnapshotRecordsByOwner;
