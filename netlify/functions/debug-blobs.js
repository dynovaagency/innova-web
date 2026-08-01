export const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hasSiteID: !!process.env.NETLIFY_SITE_ID,
      siteIDPreview: process.env.NETLIFY_SITE_ID?.slice(0, 8) || null,
      hasBlobsToken: !!process.env.NETLIFY_BLOBS_TOKEN,
      blobsTokenLength: process.env.NETLIFY_BLOBS_TOKEN?.length || 0,
      hasNetlifyToken: !!process.env.NETLIFY_TOKEN,
      hasContext: !!process.env.NETLIFY_BLOBS_CONTEXT,
      contextPreview: process.env.NETLIFY_BLOBS_CONTEXT?.slice(0, 20) || null,
    }, null, 2),
  };
};