const { parseJsonBody, response } = require('./common');
const { deleteEntitlements, deleteUserProfile } = require('./billing-store');

const resolveUserId = (event) => {
  const fromAuthorizer = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (typeof fromAuthorizer === 'string' && fromAuthorizer.length > 0) {
    return fromAuthorizer;
  }

  const body = parseJsonBody(event);
  if (typeof body.userId === 'string' && body.userId.length > 0) {
    return body.userId;
  }

  return '';
};

exports.handler = async (event) => {
  const userId = resolveUserId(event);
  if (!userId) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'userId is required for account deletion.'
    });
  }

  const deletedEntitlements = await deleteEntitlements(userId);
  const deletedUserProfile = await deleteUserProfile(userId);

  if (typeof globalThis.__telemetryDelete === 'function') {
    await globalThis.__telemetryDelete({ userId });
  }

  return response(200, {
    deleted: true,
    userId,
    deletedEntitlements,
    deletedUserProfile
  });
};