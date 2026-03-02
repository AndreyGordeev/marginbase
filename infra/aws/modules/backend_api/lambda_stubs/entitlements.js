exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      userId: 'stub-user',
      lastVerifiedAt: new Date().toISOString(),
      entitlements: {
        bundle: false,
        profit: true,
        breakeven: false,
        cashflow: false
      }
    })
  };
};