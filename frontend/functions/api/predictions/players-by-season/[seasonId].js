// Cloudflare Pages Function with KV caching for squad data
// This provides <100ms response times for squad data by caching in Cloudflare KV

const BACKEND_URL = 'https://cricketmela-api.fly.dev';
const CACHE_TTL = 21600; // 6 hour cache (squad data rarely changes)

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
  const url = new URL(request.url);
  const team1 = url.searchParams.get('team1');
  const team2 = url.searchParams.get('team2');
  const isFilteredRequest = !!(team1 && team2);
  
  const cacheKey = `squad:${seasonId}`;

  try {
    // Check if KV namespace is available and this is NOT a filtered request
    // We only cache full squad data, not filtered responses
    if (env.SQUAD_CACHE && !isFilteredRequest) {
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
    } else if (isFilteredRequest) {
      console.log(`Filtered request (team1=${team1}, team2=${team2}), bypassing cache`);
    }

    // Cache miss or KV not available or filtered request - fetch from backend
    let backendUrl = `${BACKEND_URL}/api/predictions/players-by-season/${seasonId}`;
    if (team1 && team2) {
      backendUrl += `?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`;
    }
    
    // Clone request headers
    const headers = new Headers(request.headers);
    headers.delete('host');

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: headers,
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    const data = await backendResponse.json();

    // Store in KV cache ONLY if this is NOT a filtered request
    // We only cache full squad data to avoid cache pollution
    if (env.SQUAD_CACHE && !isFilteredRequest) {
      try {
        await env.SQUAD_CACHE.put(cacheKey, JSON.stringify(data), {
          expirationTtl: CACHE_TTL,
        });
        console.log(`Stored in KV cache: season ${seasonId} (full squad data)`);
      } catch (cacheErr) {
        console.warn('Failed to store in KV cache (non-critical):', cacheErr.message);
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache-Status': isFilteredRequest ? 'BYPASS' : 'MISS',
        'X-Cache-Source': isFilteredRequest ? 'backend-filtered' : (env.SQUAD_CACHE ? 'backend-then-kv' : 'backend-only'),
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
