const crypto = require('node:crypto');
const { response, resolveRequesterUserId } = require('./common');
const { deleteSnapshotRecord, getSnapshotRecord } = require('./share-store');

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

  if (record.ownerUserIdHash) {
    const requesterUserId = resolveRequesterUserId(event);
    if (!requesterUserId) {
      return response(403, {
        code: 'FORBIDDEN',
        message: 'owner identity is required to revoke this share.'
      });
    }

    const requesterHash = crypto.createHash('sha256').update(requesterUserId).digest('hex');
    if (requesterHash !== record.ownerUserIdHash) {
      return response(403, {
        code: 'FORBIDDEN',
        message: 'only the owner can revoke this share.'
      });
    }
  }

  const revoked = await deleteSnapshotRecord(token);

  return response(200, {
    revoked: Boolean(revoked),
    token
  });
};
