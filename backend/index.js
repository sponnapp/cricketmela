const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 4000;

// CORS configuration - allow localhost and production domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cricketmela.pages.dev',
  // Add your custom domain here when you set it up
  // 'https://your-custom-domain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow any .pages.dev or .trycloudflare.com domains for development
    if (origin.endsWith('.pages.dev') || origin.endsWith('.trycloudflare.com')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'data.db');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// One-time migration: if old DB exists in app dir, move it to the volume
const legacyDbPath = path.join(__dirname, 'data.db');
if (process.env.NODE_ENV === 'production' && fs.existsSync(legacyDbPath) && !fs.existsSync(DB_PATH)) {
  fs.copyFileSync(legacyDbPath, DB_PATH);
  // Keep legacy file in place; copy avoids startup failures if the volume is missing
}

function openDb() {
  return new sqlite3.Database(DB_PATH);
}

function parseMatchDateTime(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const parts = String(value).split('T');
  if (parts.length < 2) return null;
  const [datePart, timePartRaw] = parts;

  let year;
  let monthIndex;
  let day;

  const isoDate = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    year = parseInt(isoDate[1], 10);
    monthIndex = parseInt(isoDate[2], 10) - 1;
    day = parseInt(isoDate[3], 10);
  } else {
    const dmy = datePart.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
    if (!dmy) return null;
    day = parseInt(dmy[1], 10);
    const monthKey = dmy[2].toLowerCase();
    if (monthMap[monthKey] === undefined) return null;
    monthIndex = monthMap[monthKey];
    const yearRaw = dmy[3];
    year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10);
  }

  const timePart = timePartRaw.trim();
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!timeMatch) return null;
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

  if (ampm) {
    if (hour === 12) hour = 0;
    if (ampm === 'PM') hour += 12;
  }

  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

// Initialize database schema (create tables if they don't exist, add missing columns)
function initializeDatabase() {
  const db = openDb();
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      display_name TEXT,
      role TEXT DEFAULT 'picker',
      balance INTEGER DEFAULT 500,
      approved INTEGER DEFAULT 1
    )`);

    // Create seasons table
    db.run(`CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY,
      name TEXT
    )`);

    // User-to-season assignments
    db.run(`CREATE TABLE IF NOT EXISTS user_seasons (
      user_id INTEGER,
      season_id INTEGER,
      UNIQUE(user_id, season_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(season_id) REFERENCES seasons(id)
    )`);

    // Create matches table with venue column
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      season_id INTEGER,
      home_team TEXT,
      away_team TEXT,
      venue TEXT,
      scheduled_at TEXT,
      winner TEXT,
      FOREIGN KEY(season_id) REFERENCES seasons(id)
    )`);

    // Create votes table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      match_id INTEGER,
      user_id INTEGER,
      team TEXT,
      points INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Add venue column if it doesn't exist (migration for old tables)
    db.all(`PRAGMA table_info(matches)`, (err, columns) => {
      if (err) {
        console.log('Error checking matches table:', err);
        return;
      }

      if (columns && Array.isArray(columns)) {
        const hasVenue = columns.some(col => col.name === 'venue');
        if (!hasVenue) {
          db.run(`ALTER TABLE matches ADD COLUMN venue TEXT`, (alterErr) => {
            if (alterErr) {
              console.log('Note: Could not add venue column (may already exist):', alterErr.message);
            } else {
              console.log('✅ Successfully added venue column to matches table');
            }
          });
        } else {
          console.log('✅ Venue column already exists in matches table');
        }
      }
    });

    // Add password column if it doesn't exist (migration for old tables)
    db.all(`PRAGMA table_info(users)`, (err, columns) => {
      if (err) {
        console.log('Error checking users table:', err);
        return;
      }

      if (columns && Array.isArray(columns)) {
        const hasPassword = columns.some(col => col.name === 'password');
        if (!hasPassword) {
          db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (alterErr) => {
            if (alterErr) {
              console.log('Note: Could not add password column (may already exist):', alterErr.message);
            } else {
              console.log('✅ Successfully added password column to users table');
            }
          });
        } else {
          console.log('✅ Password column already exists in users table');
        }

        const hasDisplayName = columns.some(col => col.name === 'display_name');
        if (!hasDisplayName) {
          db.run(`ALTER TABLE users ADD COLUMN display_name TEXT`, (alterErr) => {
            if (alterErr) {
              console.log('Note: Could not add display_name column (may already exist):', alterErr.message);
            } else {
              console.log('✅ Successfully added display_name column to users table');
              db.run(`UPDATE users SET display_name = username WHERE display_name IS NULL`);
            }
          });
        }

        const hasApproved = columns.some(col => col.name === 'approved');
        if (!hasApproved) {
          db.run(`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1`, (alterErr) => {
            if (alterErr) {
              console.log('Note: Could not add approved column (may already exist):', alterErr.message);
            } else {
              console.log('✅ Successfully added approved column to users table');
              db.run(`UPDATE users SET approved = 1 WHERE approved IS NULL`);
            }
          });
        }
      }
    });

    // Clean up duplicate votes: keep only the latest vote per user per match
    db.all(`
      SELECT match_id, user_id, COUNT(*) as count
      FROM votes
      GROUP BY match_id, user_id
      HAVING count > 1
    `, (err, duplicates) => {
      if (err || !duplicates || duplicates.length === 0) {
        return;
      }

      console.log('Found duplicate votes, cleaning up...');
      duplicates.forEach(dup => {
        // Keep the latest vote (highest ID) and delete others
        db.run(`
          DELETE FROM votes
          WHERE match_id = ? AND user_id = ? AND id NOT IN (
            SELECT id FROM votes
            WHERE match_id = ? AND user_id = ?
            ORDER BY id DESC LIMIT 1
          )
        `, [dup.match_id, dup.user_id, dup.match_id, dup.user_id], (err2) => {
          if (!err2) {
            console.log(`✅ Cleaned up duplicate votes for match ${dup.match_id}, user ${dup.user_id}`);
          }
        });
      });
    });
  });

  setTimeout(() => db.close(), 1000); // Close after a longer delay to allow all operations
}

// Call initialization on startup
initializeDatabase();


// Simple auth middleware: expects `x-user` header with username; looks up role in DB
app.use((req, res, next) => {
  const username = req.header('x-user');
  if (!username) return next();
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    db.close();
    if (err) return next();
    if (row) req.user = { id: row.id, username: row.username, displayName: row.display_name, role: row.role, balance: row.balance, approved: row.approved };
    next();
  });
});

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized: missing user header' });
    if (Array.isArray(roles) ? roles.includes(req.user.role) : req.user.role === roles) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Return authenticated user info
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved FROM users WHERE id = ?', [req.user.id], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(row);
  });
});

// Seasons and matches
app.get('/api/seasons', (req, res) => {
  const db = openDb();
  if (req.user && req.user.role !== 'admin') {
    db.all(
      'SELECT s.* FROM seasons s JOIN user_seasons us ON us.season_id = s.id WHERE us.user_id = ?',
      [req.user.id],
      (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows || []);
      }
    );
    return;
  }
  db.all('SELECT * FROM seasons', (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.get('/api/seasons/:id/matches', (req, res) => {
  const seasonId = Number(req.params.id);
  const db = openDb();
  if (req.user && req.user.role !== 'admin') {
    db.get('SELECT 1 FROM user_seasons WHERE user_id = ? AND season_id = ?', [req.user.id, seasonId], (err, allowed) => {
      if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!allowed) { db.close(); return res.status(403).json({ error: 'Season not assigned to user' }); }
      loadSeasonMatches(db);
    });
    return;
  }
  loadSeasonMatches(db);

  function loadSeasonMatches(dbConn) {
    dbConn.all('SELECT * FROM matches WHERE season_id = ?', [seasonId], (err, rows) => {
      if (err) { dbConn.close(); return res.status(500).json({ error: 'DB error' }); }
      // for each match, aggregate votes per team
      const matches = [];
      let pending = rows.length;
      if (pending === 0) { dbConn.close(); return res.json([]); }
      rows.forEach(row => {
        db.all(
          `SELECT v.team, SUM(v.points) as total
           FROM votes v
           JOIN users u ON u.id = v.user_id
           WHERE v.match_id = ? AND u.role != 'admin'
           GROUP BY v.team`,
          [row.id],
          (err2, sums) => {
            const totals = {};
            if (!err2 && sums) sums.forEach(s => totals[s.team] = s.total);
            matches.push({
              id: row.id,
              season_id: row.season_id,
              home_team: row.home_team,
              away_team: row.away_team,
              venue: row.venue,
              scheduled_at: row.scheduled_at,
              winner: row.winner || null,
              vote_totals: totals
            });
            pending -= 1;
            if (pending === 0) {
              dbConn.close();
              // sort by scheduled_at
              matches.sort((a,b) => a.scheduled_at.localeCompare(b.scheduled_at));
              res.json(matches);
            }
          }
        );
      });
    });
  }
});

// Get all matches (admin only)
app.get('/api/matches', (req, res) => {
  const db = openDb();
  // Admin can see all matches
  if (req.user && req.user.role === 'admin') {
    db.all('SELECT id, season_id, home_team, away_team, venue, scheduled_at, winner FROM matches', (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows || []);
    });
    return;
  }
  // Non-admin users should not access this
  db.close();
  res.status(403).json({ error: 'Forbidden' });
});

// Voting endpoint: deduct user balance, insert/update vote (allow replacement before match starts)
app.post('/api/matches/:id/vote', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'admin') return res.status(403).json({ error: 'Admins cannot vote' });
  const matchId = Number(req.params.id);
  const points = parseInt(req.body.points);
  const { team } = req.body;
  if (!team || !points) return res.status(400).json({ error: 'team and points required' });

  const db = openDb();
  db.serialize(() => {
    // Check if match has started and if winner has been set
    db.get('SELECT scheduled_at, winner FROM matches WHERE id = ?', [matchId], (err, match) => {
      if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!match) { db.close(); return res.status(404).json({ error: 'Match not found' }); }

      db.get('SELECT season_id, home_team, away_team FROM matches WHERE id = ?', [matchId], (errSeason, matchMeta) => {
        if (errSeason) { db.close(); return res.status(500).json({ error: 'DB error' }); }
        if (!matchMeta) { db.close(); return res.status(404).json({ error: 'Match not found' }); }
        db.get('SELECT 1 FROM user_seasons WHERE user_id = ? AND season_id = ?', [req.user.id, matchMeta.season_id], (errAssign, allowed) => {
          if (errAssign) { db.close(); return res.status(500).json({ error: 'DB error' }); }
          if (!allowed) { db.close(); return res.status(403).json({ error: 'Season not assigned to user' }); }

          // Check if winner has been set - if yes, voting is disabled
          if (match.winner) {
            db.close();
            return res.status(400).json({ error: 'Match winner has been set. Voting is now closed.' });
          }

          // Check if match has started
          const matchTime = parseMatchDateTime(match.scheduled_at);
          if (!matchTime) {
            db.close();
            return res.status(400).json({ error: 'Invalid match schedule. Please contact admin.' });
          }
          const now = new Date();
          const cutoffTime = new Date(matchTime.getTime() - 30 * 60 * 1000);
          if (now >= cutoffTime) {
            db.close();
            return res.status(400).json({ error: 'Voting closed 30 minutes before match start.' });
          }

          // Check if user already voted for this match
          db.get('SELECT id, points, team FROM votes WHERE match_id = ? AND user_id = ?', [matchId, req.user.id], (err2, existingVote) => {
            if (err2) { db.close(); return res.status(500).json({ error: 'DB error' }); }

            if (existingVote) {
              // User already voted - check if they're changing the vote
              if (existingVote.team === team && parseInt(existingVote.points) === points) {
                // Same vote - just return success
                db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err3, user) => {
                  db.close();
                  if (err3) return res.status(500).json({ error: 'DB error' });
                  return res.json({ ok: true, balance: user.balance, message: 'Vote unchanged' });
                });
                return;
              }

              // Changing vote - need to refund old points and deduct new points
              const pointsDifference = points - parseInt(existingVote.points);

              db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err3, user) => {
                if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                const newBalance = user.balance - pointsDifference;
                if (newBalance < 0) {
                  db.close();
                  return res.status(400).json({ error: 'Insufficient balance to change vote' });
                }

                // Update balance
                db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, req.user.id], function(err4) {
                  if (err4) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                  // Update the vote (delete old and insert new to ensure fresh data in odds)
                  db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], function(err5) {
                    if (err5) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                    // Insert new vote with updated points
                    db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)', [matchId, req.user.id, team, points], function(err6) {
                      if (err6) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                      db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err7, r2) => {
                        db.close();
                        if (err7) return res.status(500).json({ error: 'DB error' });
                        return res.json({ ok: true, balance: r2.balance, message: 'Vote updated' });
                      });
                    });
                  });
                });
              });
              return;
            }

            // No existing vote - place new vote
            db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err3, user) => {
              if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }
              const balance = user.balance;
              if (balance < points) { db.close(); return res.status(400).json({ error: 'Insufficient balance' }); }

              // Deduct balance
              db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [points, req.user.id], function(err4) {
                if (err4) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                // Insert vote
                db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)', [matchId, req.user.id, team, points], function(err5) {
                  if (err5) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                  db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err6, r2) => {
                    db.close();
                    if (err6) return res.status(500).json({ error: 'DB error' });
                    res.json({ ok: true, balance: r2.balance, message: 'Vote placed' });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// Admin endpoints: create season
app.post('/api/admin/seasons', requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = openDb();
  db.run('INSERT INTO seasons (name) VALUES (?)', [name], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.status(201).json({ id: this.lastID });
  });
});

// Admin: update season
app.put('/api/admin/seasons/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const db = openDb();
  db.run('UPDATE seasons SET name = ? WHERE id = ?', [name, id], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Season not found' });
    res.json({ ok: true, message: 'Season updated' });
  });
});

// Admin: delete season
app.delete('/api/admin/seasons/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);

  const db = openDb();
  db.serialize(() => {
    // First check if season exists
    db.get('SELECT id, name FROM seasons WHERE id = ?', [id], (err, season) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!season) {
        db.close();
        return res.status(404).json({ error: 'Season not found' });
      }

      // Delete all votes for matches in this season
      db.run('DELETE FROM votes WHERE match_id IN (SELECT id FROM matches WHERE season_id = ?)', [id], function(err1) {
        if (err1) {
          db.close();
          return res.status(500).json({ error: 'Failed to delete votes' });
        }

        // Delete all matches for this season
        db.run('DELETE FROM matches WHERE season_id = ?', [id], function(err2) {
          if (err2) {
            db.close();
            return res.status(500).json({ error: 'Failed to delete matches' });
          }

          // Delete the season
          db.run('DELETE FROM seasons WHERE id = ?', [id], function(err3) {
            db.close();
            if (err3) {
              return res.status(500).json({ error: 'Failed to delete season' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Season not found' });
            }
            res.json({ ok: true, message: 'Season deleted successfully' });
          });
        });
      });
    });
  });
});

// Admin: create new user
app.post('/api/admin/users', requireRole('admin'), (req, res) => {
  const { username, password, role, balance, display_name, season_ids } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  if (!password) return res.status(400).json({ error: 'password required' });

  const db = openDb();
  const userRole = role || 'picker';
  const userBalance = balance ?? 500;
  const displayName = display_name || username;
  const seasonIds = Array.isArray(season_ids) ? season_ids.map(Number).filter(Boolean) : [];

  db.serialize(() => {
    db.run('INSERT INTO users (username, password, display_name, role, balance, approved) VALUES (?, ?, ?, ?, ?, 1)',
      [username, password, displayName, userRole, userBalance], function(err) {
        if (err) { db.close(); return res.status(500).json({ error: 'User already exists or DB error' }); }
        const userId = this.lastID;
        if (seasonIds.length === 0) {
          db.close();
          return res.status(201).json({ id: userId, username, display_name: displayName, role: userRole, balance: userBalance, approved: 1 });
        }
        let pending = seasonIds.length;
        seasonIds.forEach(seasonId => {
          db.run('INSERT OR IGNORE INTO user_seasons (user_id, season_id) VALUES (?, ?)', [userId, seasonId], () => {
            pending -= 1;
            if (pending === 0) {
              db.close();
              res.status(201).json({ id: userId, username, display_name: displayName, role: userRole, balance: userBalance, approved: 1 });
            }
          });
        });
      });
  });
});

// Admin: list all users (including admin and pending)
app.get('/api/admin/users', requireRole('admin'), (req, res) => {
  const db = openDb();
  db.all('SELECT id, username, display_name, role, balance, approved FROM users ORDER BY id ASC', (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows || []);
  });
});

// Admin: list pending users for approval
app.get('/api/admin/pending-users', requireRole('admin'), (req, res) => {
  const db = openDb();
  db.all('SELECT id, username, display_name, role FROM users WHERE approved = 0 ORDER BY id ASC', (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows || []);
  });
});

// Admin: approve pending user and set balance
app.post('/api/admin/users/:id/approve', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { balance, season_ids } = req.body;
  if (balance === undefined || balance === null) {
    return res.status(400).json({ error: 'balance required' });
  }
  const db = openDb();
  db.serialize(() => {
    // Update user as approved with balance
    db.run('UPDATE users SET approved = 1, balance = ? WHERE id = ?', [balance, id], function(err) {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error: ' + err.message });
      }
      if (this.changes === 0) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

      // If season_ids provided, assign them
      if (season_ids && Array.isArray(season_ids) && season_ids.length > 0) {
        // Delete existing season assignments for this user
        db.run('DELETE FROM user_seasons WHERE user_id = ?', [id], function(delErr) {
          if (delErr) {
            console.log('Error deleting old user_seasons:', delErr);
          }

          // Insert new season assignments
          let completed = 0;
          season_ids.forEach(seasonId => {
            db.run('INSERT OR IGNORE INTO user_seasons (user_id, season_id) VALUES (?, ?)', [id, seasonId], function(insErr) {
              completed++;
              if (insErr) {
                console.log('Error assigning season:', insErr);
              }
              if (completed === season_ids.length) {
                db.close();
                res.json({ ok: true, message: 'User approved and seasons assigned' });
              }
            });
          });
        });
      } else {
        db.close();
        res.json({ ok: true, message: 'User approved' });
      }
    });
  });
});

// Admin: update user role and balance
app.put('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { role, balance, display_name } = req.body;

  if (!role && balance === undefined && !display_name) {
    return res.status(400).json({ error: 'role, display_name or balance required' });
  }

  const db = openDb();
  let updates = [];
  let values = [];

  if (role) {
    updates.push('role = ?');
    values.push(role);
  }
  if (balance !== undefined) {
    updates.push('balance = ?');
    values.push(balance);
  }
  if (display_name) {
    updates.push('display_name = ?');
    values.push(display_name);
  }

  values.push(id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, values, function(err) {
    db.close();
    if (err) {
      return res.status(500).json({ error: 'DB error: ' + err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true, message: 'User updated' });
  });
});

// Admin: reset user password
app.put('/api/admin/users/:id/password', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword required' });
  }

  const db = openDb();
  db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, id], function(err) {
    db.close();
    if (err) {
      return res.status(500).json({ error: 'DB error: ' + err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true, message: 'Password reset successfully' });
  });
});

// Admin: delete user
app.delete('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);

  const db = openDb();
  db.serialize(() => {
    // First check if user exists
    db.get('SELECT id, username FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!user) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete user's votes first (foreign key constraint)
      db.run('DELETE FROM votes WHERE user_id = ?', [id], function(err1) {
        if (err1) {
          db.close();
          return res.status(500).json({ error: 'Failed to delete user votes' });
        }

        // Now delete the user
        db.run('DELETE FROM users WHERE id = ?', [id], function(err2) {
          db.close();
          if (err2) {
            return res.status(500).json({ error: 'Failed to delete user' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          res.json({ ok: true, message: 'User deleted successfully' });
        });
      });
    });
  });
});

// Signup endpoint: create pending user
app.post('/api/signup', (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  // Use username as default display_name if not provided
  const finalDisplayName = display_name || username;
  const db = openDb();
  db.run('INSERT INTO users (username, password, display_name, role, balance, approved) VALUES (?, ?, ?, ?, ?, 0)',
    [username, password, finalDisplayName, 'picker', 0], function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'User already exists or DB error' });
      res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
    });
});

// EMERGENCY: Fix admin password endpoint (one-time use)
app.post('/api/emergency-reset-admin', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'newPassword required' });

  const db = openDb();
  db.run(`UPDATE users SET password = ?, approved = 1 WHERE username = 'admin'`, [newPassword], function(err) {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }
    db.close();
    res.json({ ok: true, message: 'Admin password reset successfully', rowsAffected: this.changes });
  });
});

// EMERGENCY: Create or reset admin (one-time use)
app.post('/api/emergency-create-admin', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'newPassword required' });

  const db = openDb();
  db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }

    if (!row) {
      db.run(
        "INSERT INTO users (username, role, balance, password, display_name, approved) VALUES (?,?,?,?,?,?)",
        ['admin', 'admin', 1000, newPassword, 'Admin', 1],
        function(insertErr) {
          if (insertErr) {
            db.close();
            return res.status(500).json({ error: 'DB error' });
          }
          db.close();
          return res.json({ ok: true, message: 'Admin created', rowsAffected: this.changes });
        }
      );
      return;
    }

    db.run(
      "UPDATE users SET password = ?, approved = 1 WHERE username = 'admin'",
      [newPassword],
      function(updateErr) {
        db.close();
        if (updateErr) return res.status(500).json({ error: 'DB error' });
        res.json({ ok: true, message: 'Admin password reset', rowsAffected: this.changes });
      }
    );
  });
});

// EMERGENCY: Debug endpoint to check users
app.get('/api/emergency-check-users', (req, res) => {
  const db = openDb();
  db.all('SELECT id, username, password, role, approved FROM users', (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ users: rows });
  });
});

// Login endpoint: username + password auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved, password FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const passwordOk = row.password ? password === row.password : password === 'password';
    if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });
    if (!row.approved) return res.status(403).json({ error: 'Account pending admin approval' });
    res.json({ id: row.id, username: row.username, display_name: row.display_name, role: row.role, balance: row.balance });
  });
});

app.get('/api/standings', (req, res) => {
  const db = openDb();
  db.all("SELECT id, username, display_name, role, balance FROM users WHERE role != 'admin' AND approved = 1 ORDER BY balance DESC", (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows || []);
  });
});

// Get user's vote history
app.get('/api/users/:userId/votes', (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();
  db.all(`
    SELECT v.id, v.match_id, v.team, v.points, v.created_at, m.home_team, m.away_team, m.winner
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ?
    ORDER BY v.created_at DESC
  `, [userId], (err, rows) => {
    if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
    if (!rows || rows.length === 0) { db.close(); return res.json([]); }

    const matchIds = [...new Set(rows.map(r => r.match_id))];
    const placeholders = matchIds.map(() => '?').join(',');

    db.all(
      `SELECT match_id, team, SUM(points) as total
       FROM votes
       WHERE match_id IN (${placeholders})
       GROUP BY match_id, team`,
      matchIds,
      (err2, totalsRows) => {
        db.close();
        if (err2) return res.status(500).json({ error: 'DB error' });

        const totalsByMatch = {};
        (totalsRows || []).forEach(t => {
          if (!totalsByMatch[t.match_id]) totalsByMatch[t.match_id] = {};
          totalsByMatch[t.match_id][t.team] = Number(t.total) || 0;
        });

        const withNet = rows.map(v => {
          if (!v.winner) return { ...v, net_points: null, total_payout: null };
          const totals = totalsByMatch[v.match_id] || {};
          const totalWinner = Number(totals[v.winner] || 0);
          const totalLoser = Object.keys(totals).reduce((sum, team) => team === v.winner ? sum : sum + Number(totals[team] || 0), 0);
          if (v.team === v.winner) {
            if (totalWinner === 0 || totalLoser === 0) return { ...v, net_points: 0, total_payout: Number(v.points) };
            const share = (Number(v.points) / totalWinner) * totalLoser;
            const netPoints = Number(share.toFixed(2));
            const totalPayout = Number(v.points) + netPoints;
            return { ...v, net_points: netPoints, total_payout: Number(totalPayout.toFixed(2)) };
          }
          return { ...v, net_points: -Number(v.points), total_payout: 0 };
        });

        res.json(withNet);
      }
    );
  });
});

// Admin endpoints: create match
app.post('/api/admin/matches', requireRole('admin'), (req, res) => {
  const { season_id, home_team, away_team, scheduled_at } = req.body;
  if (!season_id || !home_team || !away_team) return res.status(400).json({ error: 'season_id, home_team, away_team required' });
  const db = openDb();
  db.run('INSERT INTO matches (season_id, home_team, away_team, scheduled_at) VALUES (?, ?, ?, ?)', [season_id, home_team, away_team, scheduled_at || null], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.status(201).json({ id: this.lastID });
  });
});

// Admin edit match
app.put('/api/admin/matches/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { home_team, away_team, scheduled_at, venue } = req.body;
  const db = openDb();
  db.run('UPDATE matches SET home_team = ?, away_team = ?, scheduled_at = ?, venue = ? WHERE id = ?', [home_team, away_team, scheduled_at, venue || null, id], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ ok: true });
  });
});

// Admin delete match
app.delete('/api/admin/matches/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const db = openDb();
  db.serialize(() => {
    // First, refund all users who voted on this match
    db.all('SELECT user_id, points FROM votes WHERE match_id = ?', [id], (err, votes) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error: ' + err.message });
      }

      if (!votes || votes.length === 0) {
        // No votes to refund, just delete the match
        db.run('DELETE FROM matches WHERE id = ?', [id], function(err2) {
          db.close();
          if (err2) return res.status(500).json({ error: 'DB error: ' + err2.message });
          if (this.changes === 0) return res.status(404).json({ error: 'Match not found' });
          res.json({ ok: true, message: 'Match deleted successfully' });
        });
        return;
      }

      // Refund all users
      let processed = 0;
      votes.forEach(vote => {
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [vote.points, vote.user_id], function(err2) {
          processed += 1;
          if (processed === votes.length) {
            // All refunds done, delete votes and then the match
            db.run('DELETE FROM votes WHERE match_id = ?', [id], function(err3) {
              if (err3) {
                db.close();
                return res.status(500).json({ error: 'Failed to delete votes: ' + err3.message });
              }
              // Finally, delete the match
              db.run('DELETE FROM matches WHERE id = ?', [id], function(err4) {
                db.close();
                if (err4) return res.status(500).json({ error: 'Failed to delete match: ' + err4.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Match not found' });
                res.json({ ok: true, message: 'Match deleted and balances refunded', votesRefunded: votes.length });
              });
            });
          }
        });
      });
    });
  });
});

// Admin set match winner and distribute points
app.post('/api/admin/matches/:id/winner', requireRole(['admin', 'superuser']), (req, res) => {
  const id = Number(req.params.id);
  const { winner } = req.body;
  if (!winner) return res.status(400).json({ error: 'winner required' });
  const db = openDb();
  db.serialize(() => {
    // First get match details to find season and teams
    db.get('SELECT season_id, home_team, away_team FROM matches WHERE id = ?', [id], (errMatch, match) => {
      if (errMatch) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!match) { db.close(); return res.status(404).json({ error: 'Match not found' }); }

      const losingTeam = match.home_team === winner ? match.away_team : match.home_team;

      // Get all users assigned to this season (non-admin, approved)
      db.all(`
        SELECT DISTINCT u.id, u.username
        FROM users u
        JOIN user_seasons us ON us.user_id = u.id
        WHERE us.season_id = ? AND u.role != 'admin' AND u.approved = 1
      `, [match.season_id], (errUsers, assignedUsers) => {
        if (errUsers) { db.close(); return res.status(500).json({ error: 'DB error' }); }

        // Get all users who voted for this match
        db.all('SELECT DISTINCT user_id FROM votes WHERE match_id = ?', [id], (errVoted, votedUsers) => {
          if (errVoted) { db.close(); return res.status(500).json({ error: 'DB error' }); }

          const votedUserIds = new Set((votedUsers || []).map(v => v.user_id));
          const nonVotedUsers = (assignedUsers || []).filter(u => !votedUserIds.has(u.id));

          // Create auto-loss votes for users who didn't vote (10 points on losing team, allow negative)
          let autoVotesPending = nonVotedUsers.length;

          const continueWithDistribution = () => {
            // get vote totals per team (now including auto-loss votes)
            db.get('SELECT SUM(points) as total FROM votes WHERE match_id = ? AND team != ?', [id, winner], (err, loserRow) => {
              if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
              const totalLoser = loserRow && loserRow.total ? Number(loserRow.total) : 0;
              db.get('SELECT SUM(points) as total FROM votes WHERE match_id = ? AND team = ?', [id, winner], (err2, winnerRow) => {
                if (err2) { db.close(); return res.status(500).json({ error: 'DB error' }); }
                const totalWinner = winnerRow && winnerRow.total ? Number(winnerRow.total) : 0;
                // update match winner
                db.run('UPDATE matches SET winner = ? WHERE id = ?', [winner, id], function(err3) {
                  if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }
                  if (totalLoser === 0 || totalWinner === 0) {
                    // nothing to distribute (either no losers or no winners), just finish
                    db.close();
                    return res.json({ ok: true, distributed: 0, autoLoss: nonVotedUsers.length });
                  }
                  // For each winner vote, compute payout = stake + (stake/totalWinner)*totalLoser
                  db.all('SELECT id, user_id, points FROM votes WHERE match_id = ? AND team = ?', [id, winner], (err4, winnerVotes) => {
                    if (err4) { db.close(); return res.status(500).json({ error: 'DB error' }); }
                    const payouts = winnerVotes.map(v => ({ user_id: v.user_id, stake: v.points, share: (v.points / totalWinner) * totalLoser }));
                    // Apply payouts (add stake back + share)
                    const ops = payouts.length;
                    let done = 0;
                    payouts.forEach(p => {
                      const amount = p.stake + p.share; // return stake + winnings
                      db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, p.user_id], function(err5) {
                        if (err5) console.error('Error updating user balance', err5);
                        done += 1;
                        if (done === ops) {
                          // finished
                          db.close();
                          return res.json({ ok: true, distributed: totalLoser, autoLoss: nonVotedUsers.length });
                        }
                      });
                    });
                  });
                });
              });
            });
          };

          if (autoVotesPending === 0) {
            continueWithDistribution();
            return;
          }

          // Create auto-loss votes
          nonVotedUsers.forEach(user => {
            const autoPoints = 10;
            // Deduct balance (allow negative)
            db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [autoPoints, user.id], (errBal) => {
              if (errBal) console.error('Error deducting auto-loss balance:', errBal);
              // Insert auto-loss vote
              db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)',
                [id, user.id, losingTeam, autoPoints], (errVote) => {
                  if (errVote) console.error('Error creating auto-loss vote:', errVote);
                  autoVotesPending -= 1;
                  if (autoVotesPending === 0) {
                    continueWithDistribution();
                  }
                });
            });
          });
        });
      });
    });
  });
});


// Admin: Clear votes and odds for a specific match (returns user balances)
app.post('/api/admin/matches/:id/clear-votes', requireRole('admin'), (req, res) => {
  const matchId = Number(req.params.id);
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  const db = openDb();
  db.serialize(() => {
    // Get all votes for this match to refund balances
    db.all('SELECT user_id, points FROM votes WHERE match_id = ?', [matchId], (err1, votes) => {
      if (err1) { db.close(); return res.status(500).json({ error: 'Failed to fetch votes: ' + err1.message }); }

      // If no votes, just return success
      if (!votes || votes.length === 0) {
        db.close();
        return res.json({ ok: true, message: 'No votes to clear', refunded: 0 });
      }

      // Refund all users for their votes on this match
      let refundTotal = 0;
      let processed = 0;

      votes.forEach(vote => {
        refundTotal += vote.points;
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [vote.points, vote.user_id], function(err2) {
          processed += 1;
          if (processed === votes.length) {
            // All refunds done, now delete the votes
            db.run('DELETE FROM votes WHERE match_id = ?', [matchId], function(err3) {
              db.close();
              if (err3) {
                return res.status(500).json({ error: 'Failed to delete votes: ' + err3.message });
              }
              res.json({ ok: true, message: 'Votes cleared and balances refunded', refunded: refundTotal, votesCleared: votes.length });
            });
          }
        });
      });
    });
  });
});

// Admin: TEMPORARY - Clear matches for a specific season (for data cleanup only)
app.post('/api/admin/clear-matches', requireRole('admin'), (req, res) => {
  const { seasonId } = req.body;
  if (!seasonId) return res.status(400).json({ error: 'seasonId required' });

  const db = openDb();
  db.serialize(() => {
    // First delete all votes for matches in this season
    db.run('DELETE FROM votes WHERE match_id IN (SELECT id FROM matches WHERE season_id = ?)', [seasonId], function(err1) {
      if (err1) {
        db.close();
        return res.status(500).json({ error: 'Failed to delete votes: ' + err1.message });
      }
      // Then delete all matches in this season
      db.run('DELETE FROM matches WHERE season_id = ?', [seasonId], function(err2) {
        db.close();
        if (err2) {
          return res.status(500).json({ error: 'Failed to delete matches: ' + err2.message });
        }
        res.json({ ok: true, message: 'All matches for this season cleared successfully' });
      });
    });
  });
});

// Admin: upload CSV for matches
app.post('/api/admin/upload-matches', requireRole('admin'), (req, res) => {
  const { csvData, seasonId } = req.body;
  if (!csvData || !seasonId) return res.status(400).json({ error: 'csvData and seasonId required' });

  const db = openDb();
  const lines = csvData.trim().split('\n').slice(1); // skip header
  const insertMatch = (date, venue, team1, team2, time) => new Promise((resolve, reject) => {
    // Combine date and time into scheduled_at
    const scheduled_at = `${date}T${time}`;
    db.run('INSERT INTO matches (season_id, home_team, away_team, scheduled_at, venue) VALUES (?, ?, ?, ?, ?)',
      [seasonId, team1, team2, scheduled_at, venue], function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
  });

  (async () => {
    try {
      const inserted = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',').map(s => s.trim());
        // Expected format: Date,Venue,Team 1,Team 2,Time
        // Index:          0     1       2        3       4
        if (parts.length >= 5) {
          const date = parts[0];      // Date
          const venue = parts[1];     // Venue
          const team1 = parts[2];     // Team 1
          const team2 = parts[3];     // Team 2
          const time = parts[4];      // Time

          if (date && venue && team1 && team2 && time) {
            const id = await insertMatch(date, venue, team1, team2, time);
            inserted.push(id);
          }
        }
      }
      db.close();
      res.json({ ok: true, inserted: inserted.length });
    } catch (e) {
      db.close();
      res.status(500).json({ error: e.message });
    }
  })();
});

// Update user profile (display name, password). Username is immutable.
app.put('/api/users/:id/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const id = Number(req.params.id);
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { display_name, password, current_password } = req.body;
  if (!display_name && !password) {
    return res.status(400).json({ error: 'display_name or password required' });
  }

  // If changing password, require current password
  if (password && !current_password) {
    return res.status(400).json({ error: 'Current password required to change password' });
  }

  const db = openDb();

  // If password change requested, validate current password first
  if (password) {
    db.get('SELECT password FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!row) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password (handle null/empty passwords with default 'password')
      const storedPassword = row.password || 'password';
      if (storedPassword !== current_password) {
        db.close();
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Check if new password is different from current
      if (password === storedPassword) {
        db.close();
        return res.status(400).json({ error: 'New password must be different from current password' });
      }

      // Proceed with update
      const updates = [];
      const values = [];
      if (display_name) {
        updates.push('display_name = ?');
        values.push(display_name);
      }
      updates.push('password = ?');
      values.push(password);
      values.push(id);

      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err2) {
        db.close();
        if (err2) return res.status(500).json({ error: 'DB error' });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ ok: true, message: 'Profile updated' });
      });
    });
  } else {
    // Only updating display name, no password validation needed
    if (!display_name) {
      db.close();
      return res.status(400).json({ error: 'display_name required' });
    }
    db.run('UPDATE users SET display_name = ? WHERE id = ?', [display_name, id], function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ ok: true, message: 'Profile updated' });
    });
  }
});

// Admin: Get user's assigned seasons
app.get('/api/admin/users/:id/seasons', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.id);
  const db = openDb();
  db.all('SELECT season_id FROM user_seasons WHERE user_id = ?', [userId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json((rows || []).map(r => r.season_id));
  });
});

// Admin: Update user's assigned seasons
app.put('/api/admin/users/:id/seasons', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.id);
  const { season_ids } = req.body;

  if (!Array.isArray(season_ids)) {
    return res.status(400).json({ error: 'season_ids array required' });
  }

  const seasonIds = season_ids.map(Number).filter(Boolean);

  const db = openDb();
  db.serialize(() => {
    // First delete all existing assignments
    db.run('DELETE FROM user_seasons WHERE user_id = ?', [userId], (err1) => {
      if (err1) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }

      if (seasonIds.length === 0) {
        db.close();
        return res.json({ ok: true, message: 'Seasons updated' });
      }

      // Insert new assignments
      let pending = seasonIds.length;
      seasonIds.forEach(seasonId => {
        db.run('INSERT INTO user_seasons (user_id, season_id) VALUES (?, ?)', [userId, seasonId], (err2) => {
          if (err2) console.error('Error inserting season assignment:', err2);
          pending -= 1;
          if (pending === 0) {
            db.close();
            res.json({ ok: true, message: 'Seasons updated' });
          }
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

