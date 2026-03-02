exports.handler = async () => {
  return {
    statusCode: 202,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      accepted: true,
      endpoint: 'telemetry_batch',
      message: 'Telemetry batch stub deployed.'
    })
  };
};