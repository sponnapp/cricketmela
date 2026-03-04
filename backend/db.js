const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use persistent volume in production (Fly.io) or local in development
const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'data.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

console.log(`Using database at: ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error('Failed to open DB', err);
  console.log('Database connected successfully');
});

function hasColumn(table, column, cb) {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) return cb(err);
    const found = rows.some(r => r.name === column);
    cb(null, found);
  });
}

db.serialize(() => {
  // Ensure tables exist
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      colors TEXT,
      sizes TEXT,
      image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password TEXT,
      display_name TEXT,
      email TEXT DEFAULT 'xyz@xyz.com',
      approved INTEGER DEFAULT 1,
      balance REAL DEFAULT 100
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      season_id INTEGER NOT NULL,
      home_team TEXT,
      away_team TEXT,
      scheduled_at TEXT,
      winner TEXT,
      FOREIGN KEY(season_id) REFERENCES seasons(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      team TEXT NOT NULL,
      points REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Seed users if not present
  db.get("SELECT COUNT(*) as cnt FROM users", (err, row) => {
    if (err) {
      console.error('Error counting users', err);
    } else if (row && row.cnt === 0) {
      const stmt = db.prepare('INSERT INTO users (username, role, balance, password, display_name, approved) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run('admin', 'admin', 1000, 'admin123', 'Admin', 1);
      stmt.run('senthil', 'picker', 500, 'senthil123', 'Senthil', 1);
      stmt.finalize(() => console.log('Inserted sample users with passwords'));
    } else {
      // ensure admin and senthil exist with passwords
      db.get("SELECT id, password FROM users WHERE username='admin'", (e,a)=>{
        if (e) return;
        if (!a) {
          db.run('INSERT INTO users (username, role, balance, password, display_name, approved) VALUES (?,?,?,?,?,?)',
            ['admin','admin',1000,'admin123','Admin',1]);
        } else if (!a.password) {
          // User exists but has no password - set default
          db.run('UPDATE users SET password = ?, display_name = ?, approved = 1 WHERE username = ?',
            ['admin123', 'Admin', 'admin']);
          console.log('Set default password for admin user');
        }
      });
      db.get("SELECT id, password FROM users WHERE username='senthil'", (e,b)=>{
        if (e) return;
        if (!b) {
          db.run('INSERT INTO users (username, role, balance, password, display_name, approved) VALUES (?,?,?,?,?,?)',
            ['senthil','picker',500,'senthil123','Senthil',1]);
        } else if (!b.password) {
          // User exists but has no password - set default
          db.run('UPDATE users SET password = ?, display_name = ?, approved = 1 WHERE username = ?',
            ['senthil123', 'Senthil', 'senthil']);
          console.log('Set default password for senthil user');
        }
      });
      console.log('Users present, ensured sample users with passwords');
    }
  });

  // Seed products if empty
  db.get('SELECT COUNT(*) as cnt FROM products', (err, row) => {
    if (err) {
      console.error('Error counting products', err);
    } else if (row && row.cnt === 0) {
      const insert = (name, price, colors, sizes, image) => new Promise((resolve, reject) => {
        db.run('INSERT INTO products (name, price, colors, sizes, image) VALUES (?, ?, ?, ?, ?)', [name, price, colors, sizes, image], function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        });
      });

      (async () => {
        try {
          await insert('IPL Team Comforter - Mumbai Indians', 79.99, JSON.stringify(['blue','gold']), JSON.stringify(['Queen','King']), '/images/mi-comforter.jpg');
          await insert('IPL Team Duvet - Chennai Super Kings', 89.99, JSON.stringify(['yellow','blue']), JSON.stringify(['Queen','King']), '/images/csk-duvet.jpg');
          console.log('Inserted sample products');
        } catch (e) {
          console.error('Error inserting sample products', e);
        }
      })();
    } else {
      console.log('Products present, skipping seed');
    }
  });

  // Seed seasons and matches if none exist
  db.get('SELECT COUNT(*) as cnt FROM seasons', (err, row) => {
    if (err) {
      console.error('Error counting seasons', err);
    } else if (row && row.cnt === 0) {
      const insertSeason = (name) => new Promise((resolve, reject) => {
        db.run('INSERT INTO seasons (name) VALUES (?)', [name], function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        });
      });
      const insertMatch = (season_id, home, away, sched) => new Promise((resolve, reject) => {
        db.run('INSERT INTO matches (season_id, home_team, away_team, scheduled_at) VALUES (?, ?, ?, ?)', [season_id, home, away, sched], function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        });
      });

      (async () => {
        try {
          const s1 = await insertSeason('IPL 2025');
          await insertMatch(s1, 'Mumbai Indians', 'Chennai Super Kings', '2025-04-01T19:00:00Z');
          await insertMatch(s1, 'Royal Challengers', 'Kolkata Knight Riders', '2025-04-02T19:00:00Z');
          console.log('Inserted sample season and matches');
        } catch (e) {
          console.error('Error inserting seasons/matches', e);
        }
      })();
    } else {
      console.log('Seasons present, skipping seed');
    }
  });

  // Ensure there's a settings row for winner (if not present)
  db.get("SELECT value FROM settings WHERE key = 'winner'", (err, row) => {
    if (err) {
      console.error('Error checking winner setting', err);
    } else if (!row) {
      db.run("INSERT INTO settings (key, value) VALUES ('winner', NULL)", (err) => {
        if (err) console.error('Error inserting winner setting', err);
      });
    }
  });

  // Migration: Add google_id column to users table
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Error checking users table structure:', err);
      return;
    }

    const hasGoogleId = columns && columns.some(c => c.name === 'google_id');
    if (!hasGoogleId) {
      db.run('ALTER TABLE users ADD COLUMN google_id TEXT', (err) => {
        if (err) {
          console.error('Error adding google_id column:', err);
        } else {
          console.log('✅ Added google_id column to users table');
          // Create unique index on google_id
          db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_google_id ON users(google_id)', (err) => {
            if (err) console.log('✅ Index already exists');
            else console.log('✅ Created unique index on google_id');
          });
        }
      });
    } else {
      console.log('✅ google_id column already exists');
    }
  });

  // Migration: Add email column if not present
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Error checking users table structure:', err);
      return;
    }

    const hasEmail = columns && columns.some(c => c.name === 'email');
    if (!hasEmail) {
      db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT 'xyz@xyz.com'`, (err) => {
        if (err) {
          console.error('Error adding email column:', err);
        } else {
          console.log('✅ Added email column to users table');
        }
      });
    } else {
      console.log('✅ email column already exists');
    }
  });

  // Migration: Create password_reset_tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating password_reset_tokens table:', err);
    else console.log('✅ password_reset_tokens table ready');
  });

});

// close DB after a short delay to allow async seeds to finish
setTimeout(() => {
  db.close((err) => {
    if (err) console.error('Error closing DB', err);
    else console.log('DB migration finished and closed');
  });
}, 1200);
