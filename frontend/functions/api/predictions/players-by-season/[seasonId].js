// Cloudflare Pages Function with KV caching for squad data
// This provides <100ms response times for squad data by caching in Cloudflare KV

const BACKEND_URL = 'https://cricketmela-api.fly.dev';
const CACHE_TTL = 3600; // 1 hour cache (within 100k daily read limit)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user, Authorization',
};

export async function onRequest(context) {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const seasonId = params.seasonId;
  const cacheKey = `squad:${seasonId}`;

  try {
    // Check if KV namespace is available
    if (env.SQUAD_CACHE) {
      // Try to get from KV cache first
      const cached = await env.SQUAD_CACHE.get(cacheKey, { type: 'json' });
      
      if (cached) {
        console.log(`KV cache HIT for season ${seasonId}`);
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'X-Cache-Status': 'HIT',
            'X-Cache-Source': 'cloudflare-kv',
          },
        });
      }

      console.log(`KV cache MISS for season ${seasonId}, fetching from backend`);
    }

    // Cache miss or KV not available - fetch from backend
    const backendUrl = `${BACKEND_URL}/api/predictions/players-by-season/${seasonId}`;
    
    // Clone request headers
    const headers = new Headers(request.headers);
    headers.delete('host');
    // Ensure we get uncompressed JSON
    headers.set('Accept-Encoding', 'identity');

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: headers,
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    // Get response as text first to check for corruption
    const responseText = await backendResponse.text();
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error. First 100 chars:', responseText.substring(0, 100));
      throw new Error('Invalid JSON response from backend');
    }

    // Store in KV cache for future requests (if available)
    if (env.SQUAD_CACHE) {
      try {
        await env.SQUAD_CACHE.put(cacheKey, JSON.stringify(data), {
          expirationTtl: CACHE_TTL,
        });
        console.log(`Stored in KV cache: season ${seasonId}`);
      } catch (kvError) {
        console.warn('KV cache store failed:', kvError.message);
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache-Status': 'MISS',
        'X-Cache-Source': env.SQUAD_CACHE ? 'backend-then-kv' : 'backend-only',
      },
    });

  } catch (error) {
    console.error('Squad fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch squad data', details: error.message }),
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
