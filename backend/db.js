const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'data.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error('Failed to open DB', err);
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
      role TEXT NOT NULL
    )
  `);

  // add balance column if missing
  hasColumn('users', 'balance', (err, exists) => {
    if (err) return console.error('Error checking users columns', err);
    if (!exists) {
      db.run('ALTER TABLE users ADD COLUMN balance REAL DEFAULT 100', (err2) => {
        if (err2) console.error('Error adding balance column', err2);
        else console.log('Added balance column to users');
      });
    }
  });

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
      const stmt = db.prepare('INSERT INTO users (username, role, balance) VALUES (?, ?, ?)');
      stmt.run('admin', 'admin', 1000);
      stmt.run('senthil', 'picker', 500);
      stmt.finalize(() => console.log('Inserted sample users'));
    } else {
      // ensure admin and senthil exist (in case table exists but missing rows)
      db.get("SELECT id FROM users WHERE username='admin'", (e,a)=>{
        if (e) return; if (!a) db.run('INSERT INTO users (username, role, balance) VALUES (?,?,?)', ['admin','admin',1000]);
      });
      db.get("SELECT id FROM users WHERE username='senthil'", (e,b)=>{
        if (e) return; if (!b) db.run('INSERT INTO users (username, role, balance) VALUES (?,?,?)', ['senthil','picker',500]);
      });
      console.log('Users present, ensured sample users');
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

});

// close DB after a short delay to allow async seeds to finish
setTimeout(() => {
  db.close((err) => {
    if (err) console.error('Error closing DB', err);
    else console.log('DB migration finished and closed');
  });
}, 1200);
