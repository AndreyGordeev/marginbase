const memoryStore = globalThis.__entitlementMemoryStore ?? new Map();
globalThis.__entitlementMemoryStore = memoryStore;
const memoryUserStore = globalThis.__userProfileMemoryStore ?? new Map();
globalThis.__userProfileMemoryStore = memoryUserStore;

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

const getUserProfile = async (userId) => {
  if (typeof globalThis.__userGet === 'function') {
    return globalThis.__userGet({
      tableName: getTableName(),
      userId
    });
  }

  return memoryUserStore.get(userId) ?? null;
};

const putUserProfile = async (profile) => {
  if (typeof globalThis.__userPut === 'function') {
    await globalThis.__userPut({
      tableName: getTableName(),
      profile
    });
    return;
  }

  memoryUserStore.set(profile.userId, profile);
};

const deleteEntitlements = async (userId) => {
  if (typeof globalThis.__ddbDelete === 'function') {
    await globalThis.__ddbDelete({
      tableName: getTableName(),
      userId
    });
    return true;
  }

  return memoryStore.delete(userId);
};

const deleteUserProfile = async (userId) => {
  if (typeof globalThis.__userDelete === 'function') {
    await globalThis.__userDelete({
      tableName: getTableName(),
      userId
    });
    return true;
  }

  return memoryUserStore.delete(userId);
};

exports.getRecord = getRecord;
exports.putRecord = putRecord;
exports.toEntitlementRecord = toEntitlementRecord;
exports.getUserProfile = getUserProfile;
exports.putUserProfile = putUserProfile;
exports.deleteEntitlements = deleteEntitlements;
exports.deleteUserProfile = deleteUserProfile;