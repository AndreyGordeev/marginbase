const { delegateToBackend } = require('./backend-delegate');

exports.handler = async (event, context) => {
  return delegateToBackend('handleEntitlementsLambdaEvent', event, context);
};
