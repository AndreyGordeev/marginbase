const { response } = require('./common');
const { decryptSnapshot, getSnapshotRecord } = require('./share-store');

const resolveToken = (event) => {
  const fromPathParam = event?.pathParameters?.token;
  if (typeof fromPathParam === 'string' && fromPathParam.length > 0) {
    return fromPathParam;
  }

  const rawPath = event?.rawPath;
  if (typeof rawPath === 'string' && rawPath.startsWith('/share/')) {
    const token = rawPath.slice('/share/'.length).trim();
    if (token) {
      return token;
    }
  }

  return '';
};

exports.handler = async (event) => {
  const token = resolveToken(event);
  if (!token) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'share token is required.'
    });
  }

  const record = await getSnapshotRecord(token);
  if (!record) {
    return response(404, {
      code: 'NOT_FOUND',
      message: 'share token not found.'
    });
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (typeof record.expiresAt === 'number' && record.expiresAt <= nowEpoch) {
    return response(404, {
      code: 'EXPIRED',
      message: 'share token expired.'
    });
  }

  try {
    const snapshot = decryptSnapshot(record.encryptedBlob);

    return response(200, {
      snapshot
    });
  } catch {
    return response(500, {
      code: 'DECRYPT_FAILED',
      message: 'unable to read shared snapshot.'
    });
  }
};
