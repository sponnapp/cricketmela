// Cloudflare Pages Function - D1 Seasons API  
// Provides user season access via D1 edge database

const BACKEND_URL = 'https://cricketmela-api.fly.dev';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Get username from header
    const username = request.headers.get('x-user');

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'x-user header required' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Check if D1 is available
    if (!env.DB) {
      // Fallback to backend API
      const backendResponse = await fetch(`${BACKEND_URL}/api/seasons`, {
        headers: { 'x-user': username },
      });
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Get user ID from username
    const user = await env.DB.prepare(
      'SELECT id, role FROM users WHERE LOWER(username) = LOWER(?)'
    )
      .bind(username)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get seasons based on role
    let seasons;

    if (user.role === 'admin') {
      // Admin can see all seasons
      seasons = await env.DB.prepare(`
        SELECT s.id, s.name
        FROM seasons s
        ORDER BY s.id DESC
      `)
        .all();
    } else {
      // Regular users see only assigned seasons
      seasons = await env.DB.prepare(`
        SELECT s.id, s.name
        FROM seasons s
        JOIN user_seasons us ON us.season_id = s.id
        WHERE us.user_id = ?
        ORDER BY s.id DESC
      `)
        .bind(user.id)
        .all();
    }

    return new Response(
      JSON.stringify(seasons.results || []),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Database-Source': 'd1-edge',
        },
      }
    );
  } catch (error) {
    console.error('Seasons fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch seasons', details: error.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
