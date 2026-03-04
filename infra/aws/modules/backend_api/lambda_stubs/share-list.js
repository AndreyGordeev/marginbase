const crypto = require('node:crypto');
const { response, resolveRequesterUserId } = require('./common');
const { listSnapshotRecordsByOwner, decryptSnapshot } = require('./share-store');

const hashUserId = (userId) => {
  return crypto.createHash('sha256').update(userId).digest('hex');
};

exports.handler = async (event) => {
  const userId = resolveRequesterUserId(event);
  if (!userId) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'userId is required for share list.'
    });
  }

  const ownerUserIdHash = hashUserId(userId);
  const records = await listSnapshotRecordsByOwner(ownerUserIdHash);
  const nowEpoch = Math.floor(Date.now() / 1000);

  const items = [];

  for (const record of records) {
    if (typeof record.expiresAt === 'number' && record.expiresAt <= nowEpoch) {
      continue;
    }

    let module = 'profit';
    try {
      const snapshot = decryptSnapshot(record.encryptedBlob);
      if (snapshot && typeof snapshot.module === 'string') {
        module = snapshot.module;
      }
    } catch {
      module = 'profit';
    }

    items.push({
      token: String(record.pk),
      module,
      createdAt: new Date((Number(record.createdAt) || nowEpoch) * 1000).toISOString(),
      expiresAt: new Date((Number(record.expiresAt) || nowEpoch) * 1000).toISOString()
    });
  }

  return response(200, {
    items
  });
};
