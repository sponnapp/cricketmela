// Cloudflare Pages Function - D1 Users API
// Provides user authentication and management via D1 edge database

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user, Authorization',
};

export async function onRequestPost(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Check if D1 is available
    if (!env.DB) {
      console.log('D1 not available, falling back to Fly.io backend');
      // Fallback to backend API if D1 not available
      const backendResponse = await fetch('https://cricketmela-api.fly.dev/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await backendResponse.json();
      return new Response(JSON.stringify(data), {
        status: backendResponse.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Database-Source': 'fly.io-fallback',
        },
      });
    }

    console.log('Attempting D1 login for user:', username);

    // Test if tables exist
    try {
      const tableCheck = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).first();
      
      if (!tableCheck) {
        console.error('Users table does not exist in D1, falling back to Fly.io');
        const backendResponse = await fetch('https://cricketmela-api.fly.dev/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        
        const data = await backendResponse.json();
        return new Response(JSON.stringify(data), {
          status: backendResponse.status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'X-Database-Source': 'fly.io-fallback-no-schema',
          },
        });
      }
    } catch (tableCheckError) {
      console.error('Table check failed:', tableCheckError);
      // Fall back to backend
      const backendResponse = await fetch('https://cricketmela-api.fly.dev/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await backendResponse.json();
      return new Response(JSON.stringify(data), {
        status: backendResponse.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Database-Source': 'fly.io-fallback-error',
        },
      });
    }

    // Query D1 for user (case-insensitive username)
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?'
    )
      .bind(username, password)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.approved) {
      return new Response(
        JSON.stringify({ error: 'Account not yet approved by admin' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's overall balance from all seasons
    const balanceResult = await env.DB.prepare(`
      SELECT SUM(us.balance) as total_balance
      FROM user_seasons us
      JOIN seasons s ON s.id = us.season_id
      WHERE us.user_id = ?
    `)
      .bind(user.id)
      .first();

    const balance = balanceResult?.total_balance || 0;

    return new Response(
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        balance: balance,
        display_name: user.display_name,
        approved: user.approved,
      }),
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
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed', details: error.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
