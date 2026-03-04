const crypto = require('node:crypto');
const { parseJsonBody, response, resolveRequesterUserId } = require('./common');
const { encryptSnapshot, putSnapshotRecord } = require('./share-store');

const MAX_SNAPSHOT_BYTES = 32 * 1024;
const ALLOWED_MODULES = new Set(['profit', 'breakeven', 'cashflow']);
const ALLOWED_EXPIRES_IN_DAYS = new Set([7, 30]);
const FORBIDDEN_KEY_PATTERN = /(user|email|device|vault|note|tag|telemetry|scenarioName|updatedAt)/i;

const hasForbiddenKeys = (value) => {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeys(entry));
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEY_PATTERN.test(key)) {
        return true;
      }

      if (hasForbiddenKeys(nested)) {
        return true;
      }
    }
  }

  return false;
};

const validateSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return 'snapshot must be an object.';
  }

  if (snapshot.schemaVersion !== 1) {
    return 'snapshot.schemaVersion must be 1.';
  }

  if (!ALLOWED_MODULES.has(snapshot.module)) {
    return 'snapshot.module must be one of profit, breakeven, cashflow.';
  }

  if (!snapshot.inputData || typeof snapshot.inputData !== 'object' || Array.isArray(snapshot.inputData)) {
    return 'snapshot.inputData must be an object.';
  }

  const bytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
  if (bytes > MAX_SNAPSHOT_BYTES) {
    return 'snapshot exceeds size limit.';
  }

  if (hasForbiddenKeys(snapshot)) {
    return 'snapshot includes forbidden fields.';
  }

  return null;
};

const hashUserId = (userId) => {
  if (typeof userId !== 'string' || userId.length === 0) {
    return undefined;
  }

  return crypto.createHash('sha256').update(userId).digest('hex');
};

exports.handler = async (event) => {
  const body = parseJsonBody(event);
  const snapshot = body.snapshot;
  const validationError = validateSnapshot(snapshot);

  if (validationError) {
    return response(400, {
      code: 'INVALID_SNAPSHOT',
      message: validationError
    });
  }

  const requestedDays = Number(body.expiresInDays ?? 30);
  const expiresInDays = ALLOWED_EXPIRES_IN_DAYS.has(requestedDays) ? requestedDays : 30;
  const requesterUserId = resolveRequesterUserId(event);
  const ownerUserId = requesterUserId || (typeof body.ownerUserId === 'string' ? body.ownerUserId : '');
  const ownerUserIdHash = hashUserId(ownerUserId);

  const now = Date.now();
  const expiresAtEpoch = Math.floor((now + expiresInDays * 24 * 60 * 60 * 1000) / 1000);
  const token = crypto.randomBytes(16).toString('hex');
  const encryptedBlob = encryptSnapshot(snapshot);

  await putSnapshotRecord({
    pk: token,
    encryptedBlob,
    expiresAt: expiresAtEpoch,
    createdAt: Math.floor(now / 1000),
    schemaVersion: 1,
    ownerUserIdHash
  });

  return response(200, {
    token,
    expiresAt: new Date(expiresAtEpoch * 1000).toISOString()
  });
};
