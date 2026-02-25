// Cloudflare Pages Function to proxy all API requests to Fly.io backend
// This handles all HTTP methods (GET, POST, PUT, DELETE, etc.)

const BACKEND_URL = 'https://cricketmela-api.fly.dev';

export async function onRequest(context) {
  const { request } = context;

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

    // Clone the response
    const newResponse = new Response(response.body, response);

    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-user');

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend connection failed', details: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

