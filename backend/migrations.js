// Direct database migration - runs once on startup
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'data.db');

console.log(`[MIGRATION] Starting migrations on ${DB_PATH}`);

// Create a connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[MIGRATION] Failed to open database:', err);
    process.exit(1);
  }
  console.log('[MIGRATION] Database connected');

  // Run migrations
  runMigrations();
});

function runMigrations() {
  let completed = 0;
  const total = 2;

  const allDone = () => {
    completed++;
    console.log(`[MIGRATION] Progress: ${completed}/${total}`);
    if (completed >= total) {
      console.log('[MIGRATION] All migrations complete!');
      db.close((err) => {
        if (err) console.error('[MIGRATION] Error closing db:', err);
        else console.log('[MIGRATION] Migrations done, continuing startup...');
      });
    }
  };

  // Migration 1: Add google_id column
  console.log('[MIGRATION] Checking for google_id column...');
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('[MIGRATION] Error checking columns:', err);
      allDone();
      return;
    }

    const hasGoogleId = columns && columns.some(c => c.name === 'google_id');
    if (hasGoogleId) {
      console.log('[MIGRATION] ✅ google_id column already exists');
      allDone();
    } else {
      console.log('[MIGRATION] ⚠️  google_id column missing, adding...');
      db.run('ALTER TABLE users ADD COLUMN google_id TEXT', (err) => {
        if (err) {
          console.error('[MIGRATION] Error adding google_id:', err);
        } else {
          console.log('[MIGRATION] ✅ Added google_id column');

          // Create index
          db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_google_id ON users(google_id)', (err) => {
            if (err) {
              console.log('[MIGRATION] ✅ Index already exists');
            } else {
              console.log('[MIGRATION] ✅ Created index on google_id');
            }
            allDone();
          });
        }
      });
    }
  });

  // Migration 2: Add email column
  console.log('[MIGRATION] Checking for email column...');
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('[MIGRATION] Error checking columns:', err);
      allDone();
      return;
    }

    const hasEmail = columns && columns.some(c => c.name === 'email');
    if (hasEmail) {
      console.log('[MIGRATION] ✅ email column already exists');
      allDone();
    } else {
      console.log('[MIGRATION] ⚠️  email column missing, adding...');
      db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT 'xyz@xyz.com'`, (err) => {
        if (err) {
          console.error('[MIGRATION] Error adding email:', err);
        } else {
          console.log('[MIGRATION] ✅ Added email column');
        }
        allDone();
      });
    }
  });
}

