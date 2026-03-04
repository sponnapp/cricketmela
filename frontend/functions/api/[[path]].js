// Cloudflare Pages Function to proxy all API requests to Fly.io backend
// This handles all HTTP methods (GET, POST, PUT, DELETE, etc.)

const BACKEND_URL = 'https://cricketmela-api.fly.dev';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user, Authorization',
};

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Get the path after /api/
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api/', '/api/');

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${apiPath}${url.search}`;

  // Clone the request headers
  const headers = new Headers(request.headers);

  // Remove host header to avoid conflicts
  headers.delete('host');

  // Create new request to backend
  const backendRequest = new Request(backendUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : null,
  });

  try {
    // Forward the request to the backend
    const response = await fetch(backendRequest);

    // Clone the response and add CORS headers
    const newResponse = new Response(response.body, response);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => newResponse.headers.set(k, v));

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend connection failed', details: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

