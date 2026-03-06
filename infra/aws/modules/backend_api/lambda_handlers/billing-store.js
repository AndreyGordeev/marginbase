const memoryStore = globalThis.__entitlementMemoryStore ?? new Map();
globalThis.__entitlementMemoryStore = memoryStore;
const memoryUserStore = globalThis.__userProfileMemoryStore ?? new Map();
globalThis.__userProfileMemoryStore = memoryUserStore;
const memoryWebhookEventStore = globalThis.__billingWebhookEventMemoryStore ?? new Map();
globalThis.__billingWebhookEventMemoryStore = memoryWebhookEventStore;

const webhookEventTtlSeconds = 30 * 24 * 60 * 60;

const nowEpochSeconds = () => {
  return Math.floor(Date.now() / 1000);
};

const withWebhookEventExpiry = (eventRecord) => {
  if (typeof eventRecord?.expiresAt === 'number' && Number.isFinite(eventRecord.expiresAt)) {
    return eventRecord;
  }

  return {
    ...eventRecord,
    expiresAt: nowEpochSeconds() + webhookEventTtlSeconds
  };
};

const toEntitlementRecord = (userId, payload) => {
  return {
    userId,
    lastVerifiedAt: payload.lastVerifiedAt,
    entitlements: payload.entitlements,
    status: payload.status,
    source: payload.source,
    currentPeriodEnd: payload.currentPeriodEnd ?? null,
    trialEnd: payload.trialEnd ?? null,
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

const getUserBillingProfile = async (userId) => {
  return getUserProfile(userId);
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

const putUserBillingProfile = async (profile) => {
  await putUserProfile(profile);
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

const getWebhookEvent = async (eventId) => {
  if (typeof globalThis.__webhookEventGet === 'function') {
    const eventRecord = await globalThis.__webhookEventGet({
      tableName: getTableName(),
      eventId
    });

    if (eventRecord && typeof eventRecord.expiresAt === 'number' && eventRecord.expiresAt <= nowEpochSeconds()) {
      return null;
    }

    return eventRecord;
  }

  const eventRecord = memoryWebhookEventStore.get(eventId) ?? null;

  if (eventRecord && typeof eventRecord.expiresAt === 'number' && eventRecord.expiresAt <= nowEpochSeconds()) {
    memoryWebhookEventStore.delete(eventId);
    return null;
  }

  return eventRecord;
};

const putWebhookEvent = async (eventRecord) => {
  const ttlRecord = withWebhookEventExpiry(eventRecord);

  if (typeof globalThis.__webhookEventPut === 'function') {
    await globalThis.__webhookEventPut({
      tableName: getTableName(),
      eventRecord: ttlRecord
    });
    return;
  }

  memoryWebhookEventStore.set(ttlRecord.eventId, ttlRecord);
};

exports.getRecord = getRecord;
exports.putRecord = putRecord;
exports.toEntitlementRecord = toEntitlementRecord;
exports.getUserProfile = getUserProfile;
exports.putUserProfile = putUserProfile;
exports.getUserBillingProfile = getUserBillingProfile;
exports.putUserBillingProfile = putUserBillingProfile;
exports.deleteEntitlements = deleteEntitlements;
exports.deleteUserProfile = deleteUserProfile;
exports.getWebhookEvent = getWebhookEvent;
exports.putWebhookEvent = putWebhookEvent;