const memoryStore = globalThis.__entitlementMemoryStore ?? new Map();
globalThis.__entitlementMemoryStore = memoryStore;

const toEntitlementRecord = (userId, payload) => {
  return {
    userId,
    lastVerifiedAt: payload.lastVerifiedAt,
    entitlements: payload.entitlements,
    trial: payload.trial,
    subscriptions: payload.subscriptions ?? [],
    updatedAt: payload.updatedAt ?? payload.lastVerifiedAt
  };
};

const getTableName = () => {
  return process.env.ENTITLEMENTS_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || '';
};

const getRecord = async (userId) => {
  if (typeof globalThis.__ddbGet === 'function') {
    return globalThis.__ddbGet({
      tableName: getTableName(),
      userId
    });
  }

  return memoryStore.get(userId) ?? null;
};

const putRecord = async (record) => {
  if (typeof globalThis.__ddbPut === 'function') {
    await globalThis.__ddbPut({
      tableName: getTableName(),
      record
    });
    return;
  }

  memoryStore.set(record.userId, record);
};

exports.getRecord = getRecord;
exports.putRecord = putRecord;
exports.toEntitlementRecord = toEntitlementRecord;