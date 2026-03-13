// Cloudflare Pages Functions - SPA Redirect + D1 Auto-Init
// This handles client-side routing for React Router and ensures D1 schema exists

let schemaInitialized = false;

async function initD1Schema(db) {
  console.log('📊 Initializing D1 schema for local development...');
  
  try {
    // Create all tables in sequence to avoid batch issues
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        password TEXT,
        display_name TEXT,
        email TEXT DEFAULT 'xyz@xyz.com',
        google_id TEXT,
        approved INTEGER DEFAULT 1,
        balance REAL DEFAULT 100
      )`,
      `CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS user_seasons (
        user_id INTEGER,
        season_id INTEGER,
        balance INTEGER DEFAULT 1000,
        UNIQUE(user_id, season_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        home_team TEXT,
        away_team TEXT,
        venue TEXT,
        scheduled_at TEXT,
        winner TEXT,
        FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `INSERT OR IGNORE INTO users (id, username, role, password, display_name, approved)
       VALUES (1, 'admin', 'admin', 'admin123', 'Admin', 1)`,
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('winner', NULL)`
    ];
    
    for (const sql of statements) {
      await db.prepare(sql).run();
    }
    
    console.log('✅ D1 schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ D1 schema initialization failed:', error.message);
    return false;
  }
}

export async function onRequest(context) {
  const { env, next } = context;
  const url = new URL(context.request.url);

  // Auto-initialize D1 schema if needed (local dev only)
  if (env.DB && !schemaInitialized && url.pathname.startsWith('/api')) {
    const initialized = await initD1Schema(env.DB);
    if (initialized) {
      schemaInitialized = true;
    }
  }

  // Don't redirect API calls, auth calls, or static assets
  if (url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/assets') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
    return next();
  }

  // For all other routes, return index.html (SPA routing)
  // Preserve query string so /?page=matches&season=2 survives the rewrite
  const indexUrl = new URL('/index.html', context.request.url);
  indexUrl.search = url.search;
  return context.env.ASSETS.fetch(indexUrl);
}

