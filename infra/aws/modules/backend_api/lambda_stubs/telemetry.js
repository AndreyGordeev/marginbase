const crypto = require('node:crypto');
const { parseJsonBody, response } = require('./common');

const MAX_BATCH_SIZE = 50;
const MAX_PAYLOAD_BYTES = 64 * 1024;

const ALLOWED_EVENT_NAMES = new Set([
  'app_opened',
  'module_opened',
  'paywall_shown',
  'upgrade_clicked',
  'checkout_redirected',
  'purchase_confirmed',
  'export_clicked',
  'embed_opened',
  'embed_cta_clicked',
  'scenario_created',
  'scenario_deleted',
  'scenario_duplicated',
  'import_completed',
  'export_completed',
  'entitlements_refreshed',
  'subscription_opened',
  'settings_opened'
]);

const DISALLOWED_FIELD_PATTERN = /(minor|amount|price|cost|revenue|profit|cash|margin|break_even|breakeven)/i;

const hasDisallowedFields = (value, currentPath = '') => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (hasDisallowedFields(value[index], `${currentPath}[${index}]`)) {
        return true;
      }
    }
    return false;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (DISALLOWED_FIELD_PATTERN.test(key) || DISALLOWED_FIELD_PATTERN.test(nextPath)) {
        return true;
      }

      if (hasDisallowedFields(nested, nextPath)) {
        return true;
      }
    }
  }

  return false;
};

const createTelemetryKey = (userId) => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  return `${yyyy}/${mm}/${dd}/${userId}/${crypto.randomUUID()}.json`;
};

const writeToS3 = async (bucket, key, body) => {
  const hasTestWriter = typeof globalThis.__telemetryWrite === 'function';
  if (hasTestWriter) {
    await globalThis.__telemetryWrite({ bucket, key, body });
    return;
  }

  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({});

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json'
    })
  );
};

exports.handler = async (event) => {
  const body = parseJsonBody(event);
  const userId = typeof body.userId === 'string' && body.userId ? body.userId : 'anonymous';
  const events = Array.isArray(body.events) ? body.events : [];

  if (events.length === 0 || events.length > MAX_BATCH_SIZE) {
    return response(400, {
      code: 'INVALID_BATCH',
      message: `Telemetry batch must include 1..${MAX_BATCH_SIZE} events.`
    });
  }

  for (const eventItem of events) {
    if (!eventItem || typeof eventItem !== 'object') {
      return response(400, {
        code: 'INVALID_EVENT',
        message: 'Telemetry event must be an object.'
      });
    }

    if (!ALLOWED_EVENT_NAMES.has(eventItem.name)) {
      return response(400, {
        code: 'DISALLOWED_EVENT',
        message: `Event is not allowlisted: ${String(eventItem.name)}`
      });
    }

    if (hasDisallowedFields(eventItem)) {
      return response(400, {
        code: 'DISALLOWED_FIELD',
        message: 'Telemetry payload includes prohibited financial fields.'
      });
    }
  }

  const writePayload = {
    userId,
    receivedAt: new Date().toISOString(),
    events
  };

  const serialized = JSON.stringify(writePayload);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
    return response(400, {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Telemetry payload exceeds size limit.'
    });
  }

  const bucketName = process.env.TELEMETRY_BUCKET_NAME;
  if (!bucketName) {
    return response(500, {
      code: 'SERVER_MISCONFIGURED',
      message: 'Telemetry storage is not configured.'
    });
  }

  try {
    const objectKey = createTelemetryKey(userId);
    await writeToS3(bucketName, objectKey, serialized);

    return response(202, {
      accepted: true,
      count: events.length,
      objectKey
    });
  } catch {
    return response(502, {
      code: 'STORAGE_WRITE_FAILED',
      message: 'Unable to persist telemetry batch.'
    });
  }
};