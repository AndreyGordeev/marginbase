exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      ok: true,
      endpoint: 'auth_verify',
      message: 'Auth verification stub deployed.'
    })
  };
};