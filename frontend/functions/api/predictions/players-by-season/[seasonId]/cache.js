// Cloudflare Pages Function to clear squad cache from KV
// Called by admin when refreshing squad data

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user, Authorization',
};

export async function onRequest(context) {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only allow DELETE method
  if (request.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  const seasonId = params.seasonId;
  const cacheKey = `squad:${seasonId}`;

  try {
    // Check if KV namespace is available
    if (env.SQUAD_CACHE) {
      await env.SQUAD_CACHE.delete(cacheKey);
      console.log(`Cleared KV cache for season ${seasonId}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `KV cache cleared for season ${seasonId}`,
          cacheKey 
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'KV namespace not available' 
        }),
        {
          status: 503,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('KV cache clear error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to clear cache', details: error.message }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
