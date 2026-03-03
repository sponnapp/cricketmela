// Cloudflare Pages Function to proxy all OAuth auth requests to Fly.io backend
// This handles Google OAuth and other authentication routes

const BACKEND_URL = 'https://cricketmela-api.fly.dev';

export async function onRequest(context) {
  const { request } = context;

  // Get the path after /auth/
  const url = new URL(request.url);
  const authPath = url.pathname; // Keep full path including /auth/

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${authPath}${url.search}`;

  console.log('Proxying auth request to:', backendUrl);

  // Clone the request headers
  const headers = new Headers(request.headers);

  // Remove host header to avoid conflicts
  headers.delete('host');

  // Create new request to backend
  const backendRequest = new Request(backendUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : null,
    redirect: 'manual' // Important for OAuth redirects
  });

  try {
    // Forward the request to the backend
    const response = await fetch(backendRequest);

    // For OAuth redirects, we need to follow them
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // If it's a relative redirect, make it absolute
        const redirectUrl = location.startsWith('http')
          ? location
          : `${BACKEND_URL}${location}`;

        return Response.redirect(redirectUrl, response.status);
      }
    }

    // Clone response headers
    const responseHeaders = new Headers(response.headers);

    // Return the response from backend
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Auth proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Auth proxy failed',
      message: error.message
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

