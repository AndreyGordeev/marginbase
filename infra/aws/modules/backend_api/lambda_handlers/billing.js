const { delegateToBackend } = require('./backend-delegate');

exports.handler = async (event, context) => {
  return delegateToBackend('handleBillingLambdaEvent', event, context);
};
