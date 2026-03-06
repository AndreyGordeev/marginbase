const { delegateToBackend } = require('./backend-delegate');

exports.handler = async (event, context) => {
  return delegateToBackend('handleAuthLambdaEvent', event, context);
};
