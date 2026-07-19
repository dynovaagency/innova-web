export const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MOCK_MODE_raw: process.env.MOCK_MODE,
      MOCK_MODE_type: typeof process.env.MOCK_MODE,
      MOCK_MODE_length: process.env.MOCK_MODE?.length,
      MOCK_MODE_equals_true: process.env.MOCK_MODE === 'true',
      MP_ACCESS_TOKEN_present: !!process.env.MP_ACCESS_TOKEN,
      MP_ACCESS_TOKEN_prefix: process.env.MP_ACCESS_TOKEN?.slice(0, 8),
      NODE_ENV: process.env.NODE_ENV,
      CONTEXT: process.env.CONTEXT,
      BRANCH: process.env.BRANCH,
      DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
      URL: process.env.URL,
    }, null, 2),
  };
};