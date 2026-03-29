const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const emailService = require('./email');
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

// Session configuration (BEFORE passport initialization)
app.use(session({
  secret: process.env.SESSION_SECRET || 'cricket-mela-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle domain
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Load Google OAuth strategy only if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  require('./auth/googleStrategy')(passport);
  console.log('✅ Google OAuth enabled');
} else {
  console.log('⚠️  Google OAuth disabled (credentials not configured)');
}

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
  const db = require('./db');
  // Return a proxy so existing db.close() calls throughout the code are safe no-ops.
  // The real connection must stay open for the lifetime of the process.
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'close') return () => {}; // no-op
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

// ── Startup migrations (run once on server start) ──────────────────────────
(function runStartupMigrations() {
  const db = openDb();
  db.serialize(() => {
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
      if (err) console.error('[MIGRATION] Failed to create password_reset_tokens table:', err);
      else console.log('✅ [MIGRATION] password_reset_tokens table ready');
    });

    // Add is_auto_loss column to votes if missing
    db.all('PRAGMA table_info(votes)', (err, cols) => {
      if (err) { console.error('[MIGRATION] Failed to inspect votes table:', err); return; }
      const hasCol = cols && cols.some(c => c.name === 'is_auto_loss');
      if (!hasCol) {
        db.run('ALTER TABLE votes ADD COLUMN is_auto_loss INTEGER DEFAULT 0', (e) => {
          if (e) console.error('[MIGRATION] Failed to add is_auto_loss column:', e);
          else console.log('✅ [MIGRATION] is_auto_loss column added to votes');
        });
      } else {
        console.log('✅ [MIGRATION] is_auto_loss column already exists');
      }
    });
  });
})();

function parseMatchDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();

  // Cricbuzz API sends ISO timestamps in GMT/UTC - parse as UTC explicitly
  const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2})?$/);
  if (isoNoTz) {
    const utc = new Date(`${raw}Z`);
    if (!Number.isNaN(utc.getTime())) return utc;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const parts = raw.split('T');
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
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!timeMatch) return null;
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

  if (ampm) {
    if (hour === 12) hour = 0;
    if (ampm === 'PM') hour += 12;
  }

  // YYYY-MM-DD + 24h format is treated as UTC (CricAPI GMT); other formats stay local.
  if (isoDate && !ampm) {
    return new Date(Date.UTC(year, monthIndex, day, hour, minute, second, 0));
  }
  return new Date(year, monthIndex, day, hour, minute, second, 0);
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
      email TEXT DEFAULT 'xyz@xyz.com',
      role TEXT DEFAULT 'picker',
      balance INTEGER DEFAULT 500,
      approved INTEGER DEFAULT 1
    )`);

    // Create seasons table
    db.run(`CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY,
      name TEXT
    )`);

    // User-to-season assignments (with per-season balance)
    db.run(`CREATE TABLE IF NOT EXISTS user_seasons (
      user_id INTEGER,
      season_id INTEGER,
      balance INTEGER DEFAULT 1000,
      UNIQUE(user_id, season_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(season_id) REFERENCES seasons(id)
    )`);

    // Migration: Add balance column to user_seasons if it doesn't exist
    db.all(`PRAGMA table_info(user_seasons)`, (err, columns) => {
      if (err) { console.error('Error checking user_seasons columns:', err); return; }
      const hasBalance = columns && columns.some(c => c.name === 'balance');
      if (!hasBalance) {
        db.run(`ALTER TABLE user_seasons ADD COLUMN balance INTEGER DEFAULT 1000`, (alterErr) => {
          if (alterErr) console.log('Note: Could not add balance to user_seasons:', alterErr.message);
          else console.log('✅ Added balance column to user_seasons table');
        });
      } else {
        console.log('✅ user_seasons.balance column already exists');
      }
    });

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

    // Create predictions table for match predictions feature
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY,
      match_id INTEGER,
      user_id INTEGER,
      toss_winner TEXT,
      man_of_match TEXT,
      best_bowler TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(match_id, user_id),
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create prediction_results table for storing actual match outcomes
    db.run(`CREATE TABLE IF NOT EXISTS prediction_results (
      id INTEGER PRIMARY KEY,
      match_id INTEGER UNIQUE,
      toss_winner TEXT,
      man_of_match TEXT,
      best_bowler TEXT,
      FOREIGN KEY(match_id) REFERENCES matches(id)
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

        const hasEmail = columns.some(col => col.name === 'email');
        if (!hasEmail) {
          db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT 'xyz@xyz.com'`, (alterErr) => {
            if (alterErr) {
              console.log('Note: Could not add email column (may already exist):', alterErr.message);
            } else {
              console.log('✅ Successfully added email column to users table');
              db.run(`UPDATE users SET email = 'xyz@xyz.com' WHERE email IS NULL`);
            }
          });
        }
      }
    });

    // Migration: Add cricapi_series_id column to seasons if it doesn't exist
    db.all(`PRAGMA table_info(seasons)`, (err, columns) => {
      if (err) { console.error('Error checking seasons columns:', err); return; }
      const hasSeriesId = columns && columns.some(c => c.name === 'cricapi_series_id');
      if (!hasSeriesId) {
        db.run(`ALTER TABLE seasons ADD COLUMN cricapi_series_id TEXT`, (alterErr) => {
          if (alterErr) console.log('Note: Could not add cricapi_series_id to seasons:', alterErr.message);
          else console.log('✅ Added cricapi_series_id column to seasons table');
        });
      } else {
        console.log('✅ seasons.cricapi_series_id column already exists');
      }
      
      // Migration: Add cricbuzz_series_id column to seasons if it doesn't exist
      const hasCricbuzzId = columns && columns.some(c => c.name === 'cricbuzz_series_id');
      if (!hasCricbuzzId) {
        db.run(`ALTER TABLE seasons ADD COLUMN cricbuzz_series_id INTEGER`, (alterErr) => {
          if (alterErr) console.log('Note: Could not add cricbuzz_series_id to seasons:', alterErr.message);
          else console.log('✅ Added cricbuzz_series_id column to seasons table');
        });
      } else {
        console.log('✅ seasons.cricbuzz_series_id column already exists');
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
}

// Call initialization on startup
initializeDatabase();

/**
/**
 * Helper function: Process auto-loss votes for newly assigned seasons with completed matches
 * When a user is assigned to a season, for each completed match they haven't voted on:
 * - Charge them 10 points from their season balance (allow negative)
 * - Distribute those points to the winners using 1:1 ratio (season balance)
 */
function processAutoLossForNewSeasons(userId, newSeasonIds, callback) {
  if (!newSeasonIds || newSeasonIds.length === 0) {
    return callback(null);
  }

  const db = openDb();

  db.serialize(() => {
    // Get all completed matches (with winners) in the newly assigned seasons
    db.all(
      `SELECT m.id, m.season_id, m.home_team, m.away_team, m.winner
       FROM matches m
       WHERE m.season_id IN (${newSeasonIds.map(() => '?').join(',')})
       AND m.winner IS NOT NULL`,
      newSeasonIds,
      (err1, matches) => {
        if (err1) {
          db.close();
          console.error('Error fetching completed matches for auto-loss:', err1);
          return callback(err1);
        }

        if (!matches || matches.length === 0) {
          db.close();
          return callback(null);
        }

        let processed = 0;

        matches.forEach(match => {
          db.get('SELECT id FROM votes WHERE match_id = ? AND user_id = ?', [match.id, userId], (err2, existingVote) => {
            if (err2) console.error('Error checking vote for new season auto-loss:', err2);

            if (!existingVote) {
              const autoPoints = 10;
              const losingTeam = match.home_team === match.winner ? match.away_team : match.home_team;
              const seasonId = match.season_id;

              // 1. Deduct from user's season balance (allow negative)
              db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
                [autoPoints, userId, seasonId], (err3) => {
                  if (err3) console.error('Error deducting auto-loss season balance:', err3);

                  // 2. Create auto-loss vote record
                  db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)',
                    [match.id, userId, losingTeam, autoPoints], (err4) => {
                      if (err4) console.error('Error creating auto-loss vote:', err4);

                      // 3. Distribute to existing winners (add to their season balance)
                      db.get('SELECT SUM(points) as total FROM votes WHERE match_id = ? AND team = ?',
                        [match.id, match.winner], (err5, winnerRow) => {
                          if (err5) {
                            console.error('Error getting winner points:', err5);
                            processed++;
                            if (processed === matches.length) { db.close(); callback(null); }
                            return;
                          }

                          const totalWinner = winnerRow && winnerRow.total ? Number(winnerRow.total) : 0;
                          if (totalWinner === 0) {
                            processed++;
                            if (processed === matches.length) { db.close(); callback(null); }
                            return;
                          }

                          db.all('SELECT user_id, points FROM votes WHERE match_id = ? AND team = ?',
                            [match.id, match.winner], (err6, winnerVotes) => {
                              if (err6 || !winnerVotes || winnerVotes.length === 0) {
                                processed++;
                                if (processed === matches.length) { db.close(); callback(null); }
                                return;
                              }

                              let winnersProcessed = 0;
                              winnerVotes.forEach(vote => {
                                const gain = Math.round((vote.points / totalWinner) * autoPoints);
                                db.run('UPDATE user_seasons SET balance = balance + ? WHERE user_id = ? AND season_id = ?',
                                  [gain, vote.user_id, seasonId], (err7) => {
                                    if (err7) console.error('Error distributing auto-loss gain:', err7);
                                    winnersProcessed++;
                                    if (winnersProcessed === winnerVotes.length) {
                                      processed++;
                                      if (processed === matches.length) { db.close(); callback(null); }
                                    }
                                  });
                            });
                            });
                        });
                    });
                });
            } else {
              processed++;
              if (processed === matches.length) { db.close(); callback(null); }
            }
          });
        });
      }
    );
  });
}


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

function requireRole(...roles) {
  // Flatten in case called as requireRole(['admin','superuser']) or requireRole('admin','superuser')
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized: missing user header' });
    if (allowed.includes(req.user.role)) return next();
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
// Public endpoint: all seasons (no auth required, used by Standings)
app.get('/api/seasons/all', (req, res) => {
  const db = openDb();
  db.all('SELECT id, name FROM seasons ORDER BY id ASC', (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows || []);
  });
});

app.get('/api/seasons', (req, res) => {
  const db = openDb();
  if (req.user && req.user.role !== 'admin') {
    db.all(
      'SELECT s.*, us.balance as season_balance FROM seasons s JOIN user_seasons us ON us.season_id = s.id WHERE us.user_id = ?',
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

// Get user's balance for a specific season
app.get('/api/seasons/:id/my-balance', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const seasonId = Number(req.params.id);
  const db = openDb();
  db.get('SELECT balance FROM user_seasons WHERE user_id = ? AND season_id = ?',
    [req.user.id, seasonId], (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!row) return res.status(404).json({ error: 'Season not assigned to user' });
      res.json({ balance: row.balance ?? 1000 });
    });
});

// Get user's total balance across all seasons (only for currently existing seasons)
app.get('/api/users/my-total-balance', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = openDb();
  db.get(
    `SELECT COALESCE(
      (SELECT SUM(us.balance)
       FROM user_seasons us
       JOIN seasons s ON s.id = us.season_id
       WHERE us.user_id = ?),
      0) as total_balance`,
    [req.user.id],
    (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ balance: row.total_balance ?? 0 });
    }
  );
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

// Get user's vote for a specific match
app.get('/api/matches/:id/user-vote', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const matchId = Number(req.params.id);

  const db = openDb();
  db.get('SELECT team, points FROM votes WHERE match_id = ? AND user_id = ?',
    [matchId, req.user.id],
    (err, vote) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!vote) return res.status(404).json({ error: 'No vote found' });
      return res.json(vote);
    }
  );
});

// Voting endpoint: record vote only — no balance change until winner is declared
app.post('/api/matches/:id/vote', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'admin') return res.status(403).json({ error: 'Admins cannot vote' });
  const matchId = Number(req.params.id);
  const points = parseInt(req.body.points);
  const { team } = req.body;
  if (!team || !points) return res.status(400).json({ error: 'team and points required' });

  const db = openDb();
  db.serialize(() => {
    db.get('SELECT m.scheduled_at, m.winner, m.season_id, m.home_team, m.away_team FROM matches m WHERE m.id = ?', [matchId], (err, match) => {
      if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!match) { db.close(); return res.status(404).json({ error: 'Match not found' }); }

      // Check season access
      db.get('SELECT balance FROM user_seasons WHERE user_id = ? AND season_id = ?', [req.user.id, match.season_id], (errAssign, seasonRow) => {
        if (errAssign) { db.close(); return res.status(500).json({ error: 'DB error' }); }
        if (!seasonRow) { db.close(); return res.status(403).json({ error: 'Season not assigned to user' }); }

        // Check if winner has been set
        if (match.winner) {
          db.close();
          return res.status(400).json({ error: 'Match winner has been set. Voting is now closed.' });
        }

        // Check voting window (30 min cutoff)
        const matchTime = parseMatchDateTime(match.scheduled_at);
        if (!matchTime) { db.close(); return res.status(400).json({ error: 'Invalid match schedule. Please contact admin.' }); }
        const cutoffTime = new Date(matchTime.getTime() - 30 * 60 * 1000);
        if (new Date() >= cutoffTime) { db.close(); return res.status(400).json({ error: 'Voting closed 30 minutes before match start.' }); }

        // Check if vote points exceed season balance
        const seasonBalance = seasonRow.balance ?? 1000;
        db.get('SELECT id, points, team FROM votes WHERE match_id = ? AND user_id = ?', [matchId, req.user.id], (err2, existingVote) => {
          if (err2) { db.close(); return res.status(500).json({ error: 'DB error' }); }

          if (existingVote) {
            // Same vote — no change
            if (existingVote.team === team && parseInt(existingVote.points) === points) {
              db.close();
              return res.json({ ok: true, season_balance: seasonBalance, balance: req.user.balance, message: 'Vote unchanged' });
            }

            // Changing vote — check new points against season balance
            if (points > seasonBalance) {
              db.close();
              return res.status(400).json({ error: `Insufficient season balance. Available: ${seasonBalance} pts` });
            }

            // Update vote (delete old, insert new)
            db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], function(err3) {
              if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }
              db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)', [matchId, req.user.id, team, points], function(err4) {
                if (err4) { db.close(); return res.status(500).json({ error: 'DB error' }); }
                db.close();
                return res.json({ ok: true, season_balance: seasonBalance, balance: req.user.balance, message: 'Vote updated' });
              });
            });
            return;
          }

          // New vote — check points against season balance
          if (points > seasonBalance) {
            db.close();
            return res.status(400).json({ error: `Insufficient season balance. Available: ${seasonBalance} pts` });
          }

          db.run('INSERT INTO votes (match_id, user_id, team, points) VALUES (?, ?, ?, ?)', [matchId, req.user.id, team, points], function(err3) {
            if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }
            db.close();
            res.json({ ok: true, season_balance: seasonBalance, balance: req.user.balance, message: 'Vote placed' });
          });
        });
      });
    });
  });
});

// ── Cricket API Configuration ───────────────────────────────────────────────────

// CricAPI (used only for squad data)
const CRICAPI_KEY = '491b7c88-16e4-428d-b2c9-99b687267947';

// Cricbuzz via RapidAPI (primary source for series and matches)
const CRICBUZZ_API_KEY = '3c2eeb1734mshfa4037c65f7b196p1afc2bjsn8d7c6446a89e';
const CRICBUZZ_API_HOST = 'cricbuzz-cricket.p.rapidapi.com';

// Prefer known-good series IDs when CricAPI returns duplicate names with inconsistent IDs.
const CRICAPI_SERIES_ID_OVERRIDES = {
  "icc men's t20 world cup 2026": '0cdf6736-ad9b-4e95-a647-5ee3a99c5510'
};

// GET /api/admin/cricapi/series  – fetch series for next 6 months
app.get('/api/admin/cricapi/series', requireRole('admin', 'superuser'), (req, res) => {
  const https = require('https');
  const search = String(req.query.search || '').trim();
  const url = `https://api.cricapi.com/v1/series?apikey=${CRICAPI_KEY}&offset=0&search=${encodeURIComponent(search)}`;
  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (!parsed.data) return res.json({ series: [] });

        // If admin explicitly searches, do not hide older series by date window.
        const sourceList = Array.isArray(parsed.data) ? parsed.data : [];
        const now = new Date();
        const sixMonthsLater = new Date(now);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        const filtered = search
          ? sourceList
          : sourceList.filter(s => {
              if (!s.startDate) return true; // no date info — include it
              const raw = String(s.startDate).trim();
              const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/);
              if (isoMatch) {
                const startDate = new Date(raw);
                if (isNaN(startDate.getTime())) return true; // unparseable — include
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return startDate >= thirtyDaysAgo && startDate <= sixMonthsLater;
              }
              // Partial date like "Feb 15" — include when we cannot reliably place the year.
              return true;
            });

        // De-duplicate by series name (prefer entries with more complete data)
        const nameMap = new Map();
        filtered.forEach(s => {
          const name = (s.name || '').trim();
          if (!name) return;

          const existing = nameMap.get(name);
          if (!existing) {
            nameMap.set(name, s);
          } else {
            // Prefer entry with totalMatches data, or earlier start date
            const hasTotalMatches = s.totalMatches && s.totalMatches > 0;
            const existingHasTotalMatches = existing.totalMatches && existing.totalMatches > 0;

            if (hasTotalMatches && !existingHasTotalMatches) {
              nameMap.set(name, s);
            } else if (!hasTotalMatches && existingHasTotalMatches) {
              // Keep existing
            } else {
              // Both have or don't have totalMatches - prefer entry with full ISO date
              const hasFullDate = s.startDate && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate);
              const existingHasFullDate = existing.startDate && /^\d{4}-\d{2}-\d{2}$/.test(existing.startDate);
              if (hasFullDate && !existingHasFullDate) {
                nameMap.set(name, s);
              }
            }
          }
        });

        const unique = Array.from(nameMap.values()).map((s) => {
          const key = String(s.name || '').trim().toLowerCase();
          const overrideId = CRICAPI_SERIES_ID_OVERRIDES[key];
          return overrideId ? { ...s, id: overrideId } : s;
        });

        res.json({ series: unique, total: unique.length });
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse CricAPI response' });
      }
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to connect to CricAPI: ' + err.message });
  });
});

// GET /api/admin/cricapi/series/:id/matches  – fetch matches for a specific series
// KEY FIX: CricAPI duplicates series with same name across multiple IDs, each ID only
// contains SOME of the matches. We must collect from ALL duplicate IDs and merge.
app.get('/api/admin/cricapi/series/:id/matches', requireRole('admin', 'superuser'), (req, res) => {
  const https = require('https');
  const seriesId = req.params.id;
  const seriesName = String(req.query.name || '').trim();

  function getJson(url, done) {
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try { done(null, JSON.parse(data)); }
        catch (e) { done(e); }
      });
    }).on('error', done);
  }

  // Fetch matchList for one series ID
  function fetchSeriesInfo(id, done) {
    const url = `https://api.cricapi.com/v1/series_info?apikey=${CRICAPI_KEY}&id=${encodeURIComponent(id)}`;
    getJson(url, (err, parsed) => {
      if (err) return done(err);
      const info = parsed && parsed.data ? parsed.data : null;
      const matchList = (info && Array.isArray(info.matchList)) ? info.matchList : [];
      done(null, { info, matchList });
    });
  }

  // Find ALL series IDs (including the selected one) that share the same name
  function findAllSeriesIds(done) {
    const allIds = [seriesId]; // always include the selected one
    if (!seriesName) return done(null, allIds);
    const url = `https://api.cricapi.com/v1/series?apikey=${CRICAPI_KEY}&offset=0&search=${encodeURIComponent(seriesName)}`;
    getJson(url, (err, parsed) => {
      if (err) return done(null, allIds);
      const list = Array.isArray(parsed && parsed.data) ? parsed.data : [];
      const nameKey = seriesName.toLowerCase();
      const seen = new Set([seriesId]);
      for (const s of list) {
        const sName = String((s && s.name) || '').trim().toLowerCase();
        const sId = String((s && s.id) || '').trim();
        if (!sId || seen.has(sId)) continue;
        if (sName === nameKey) {
          seen.add(sId);
          allIds.push(sId);
        }
      }
      console.log(`[CricAPI] Found ${allIds.length} total series IDs for "${seriesName}": ${allIds.join(', ')}`);
      done(null, allIds);
    });
  }

  // Fetch matchList from ALL series IDs in parallel, merge and deduplicate by match name+date
  function fetchAllSeriesMatches(allIds, done) {
    let completed = 0;
    let allMatches = [];
    const seenMatchKeys = new Set();

    if (allIds.length === 0) return done(null, [], null);

    let primaryInfo = null;

    allIds.forEach((id, idx) => {
      fetchSeriesInfo(id, (err, result) => {
        completed++;
        if (!err && result && result.matchList.length > 0) {
          console.log(`[CricAPI] Series ID ${id}: ${result.matchList.length} matches`);
          if (idx === 0) primaryInfo = result.info; // keep info from first (selected) series
          result.matchList.forEach(m => {
            // Deduplicate by match name + date combo
            const key = `${(m.name || '').trim().toLowerCase()}|${(m.dateTimeGMT || m.date || '').trim()}`;
            if (!seenMatchKeys.has(key)) {
              seenMatchKeys.add(key);
              allMatches.push(m);
            }
          });
        } else {
          console.log(`[CricAPI] Series ID ${id}: 0 matches`);
        }

        if (completed === allIds.length) {
          // Sort merged matches by date
          allMatches.sort((a, b) => {
            const da = new Date(a.dateTimeGMT || a.date || 0);
            const db = new Date(b.dateTimeGMT || b.date || 0);
            return da - db;
          });
          console.log(`[CricAPI] ✅ Merged total unique matches: ${allMatches.length}`);
          done(null, allMatches, primaryInfo);
        }
      });
    });
  }

  findAllSeriesIds((_, allIds) => {
    fetchAllSeriesMatches(allIds, (err, mergedMatches, seriesInfo) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch series matches: ' + err.message });
      }
      res.json({ matches: mergedMatches, seriesInfo: seriesInfo || {} });
    });
  });
});

// POST /api/admin/cricapi/import-season – create or append to season + import selected matches
app.post('/api/admin/cricapi/import-season', requireRole('admin'), (req, res) => {
  const { seasonName, matches: matchesToImport, seriesId } = req.body;
  if (!seasonName) return res.status(400).json({ error: 'seasonName required' });
  if (!Array.isArray(matchesToImport) || matchesToImport.length === 0) {
    return res.status(400).json({ error: 'At least one match required' });
  }

  const db = openDb();
  db.serialize(() => {
    // Check if season already exists
    db.get('SELECT id, cricapi_series_id FROM seasons WHERE name = ?', [seasonName], function(err, existingSeason) {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Failed to check existing season: ' + err.message });
      }

      let seasonId;
      let isNewSeason = false;

      const insertMatches = (sid) => {
        // Get existing matches for this season to avoid duplicates
        db.all('SELECT home_team, away_team, scheduled_at FROM matches WHERE season_id = ?', [sid], (err, existingMatches) => {
          if (err) {
            db.close();
            return res.status(500).json({ error: 'Failed to fetch existing matches: ' + err.message });
          }

          // Create a Set of existing match signatures for deduplication
          const existingMatchSet = new Set(
            existingMatches.map(m => `${m.home_team}|${m.away_team}|${m.scheduled_at}`)
          );

          const stmt = db.prepare(
            'INSERT INTO matches (season_id, home_team, away_team, scheduled_at, venue) VALUES (?, ?, ?, ?, ?)'
          );
          let inserted = 0;
          let skipped = 0;
          let errors = [];

          for (const m of matchesToImport) {
            try {
              const scheduledAt = m.scheduled_at || '';
              const matchSignature = `${m.home_team}|${m.away_team}|${scheduledAt}`;

              // Skip if match already exists
              if (existingMatchSet.has(matchSignature)) {
                skipped++;
                continue;
              }

              stmt.run([sid, m.home_team, m.away_team, scheduledAt, m.venue || '']);
              inserted++;
            } catch (e) {
              errors.push(e.message);
            }
          }

          stmt.finalize(err2 => {
            db.close();
            if (err2) return res.status(500).json({ error: 'Failed to insert matches: ' + err2.message });
            res.status(201).json({ 
              ok: true, 
              seasonId: sid, 
              seasonName, 
              inserted, 
              skipped,
              errors,
              isNewSeason,
              message: isNewSeason 
                ? `Created new season "${seasonName}" with ${inserted} match(es)` 
                : `Appended ${inserted} match(es) to existing season "${seasonName}" (${skipped} duplicate(s) skipped)`
            });
          });
        });
      };

      if (existingSeason) {
        // Season exists - append matches
        seasonId = existingSeason.id;
        console.log(`✓ Found existing season "${seasonName}" (ID: ${seasonId}), appending matches...`);
        
        // Update cricapi_series_id if not set
        if (seriesId && !existingSeason.cricapi_series_id) {
          db.run('UPDATE seasons SET cricapi_series_id = ? WHERE id = ?', [seriesId, seasonId], (updateErr) => {
            if (updateErr) console.error('Warning: Failed to update cricapi_series_id:', updateErr);
            insertMatches(seasonId);
          });
        } else {
          insertMatches(seasonId);
        }
      } else {
        // Create new season
        isNewSeason = true;
        db.run('INSERT INTO seasons (name, cricapi_series_id) VALUES (?, ?)', [seasonName, seriesId || null], function(insertErr) {
          if (insertErr) {
            db.close();
            return res.status(500).json({ error: 'Failed to create season: ' + insertErr.message });
          }
          seasonId = this.lastID;
          console.log(`✓ Created new season "${seasonName}" (ID: ${seasonId})`);
          insertMatches(seasonId);
        });
      }
    });
  });
});

// ── End CricAPI proxy endpoints ───────────────────────────────────────────────

// ── Cricbuzz API endpoints (Primary source for series & matches) ──────────────

// Helper function to make Cricbuzz API requests
function fetchCricbuzz(endpoint, callback) {
  const https = require('https');
  const options = {
    hostname: CRICBUZZ_API_HOST,
    path: endpoint,
    method: 'GET',
    headers: {
      'x-rapidapi-host': CRICBUZZ_API_HOST,
      'x-rapidapi-key': CRICBUZZ_API_KEY
    }
  };
  
  const req = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        callback(null, parsed);
      } catch (e) {
        callback(e);
      }
    });
  });
  
  req.on('error', callback);
  req.end();
}

// GET /api/player-image/:imageId - Proxy player images from Cricbuzz with server-side caching
app.get('/api/player-image/:imageId', (req, res) => {
  const https = require('https');
  const fs = require('fs');
  const path = require('path');
  const imageId = req.params.imageId;
  const refresh = req.query.refresh === '1'; // Force refresh from API
  
  // Validate imageId format (should be 'c' followed by digits)
  if (!imageId || !/^c\d+$/.test(imageId)) {
    return res.status(400).json({ error: 'Invalid image ID format' });
  }

  // Setup cache directory (use persistent volume in production)
  const CACHE_DIR = process.env.NODE_ENV === 'production' 
    ? '/app/data/images' 
    : path.join(__dirname, 'cache', 'images');
  
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cachedImagePath = path.join(CACHE_DIR, `${imageId}.jpg`);

  // Check if image exists in cache and not forcing refresh
  if (!refresh && fs.existsSync(cachedImagePath)) {
    // Serve from cache
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // Cache for 30 days
    res.setHeader('X-Image-Source', 'cache');
    return fs.createReadStream(cachedImagePath).pipe(res);
  }

  // Fetch from Cricbuzz API
  const options = {
    hostname: CRICBUZZ_API_HOST,
    path: `/img/v1/i1/${imageId}/i.jpg`,
    method: 'GET',
    headers: {
      'x-rapidapi-host': CRICBUZZ_API_HOST,
      'x-rapidapi-key': CRICBUZZ_API_KEY
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    if (apiRes.statusCode !== 200) {
      return res.status(apiRes.statusCode).json({ error: 'Failed to fetch image from Cricbuzz' });
    }

    // Set content type for image
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // Cache for 30 days
    res.setHeader('X-Image-Source', 'cricbuzz-api');

    // Save to cache and pipe to response simultaneously
    const writeStream = fs.createWriteStream(cachedImagePath);
    apiRes.pipe(writeStream);
    apiRes.pipe(res);

    writeStream.on('error', (err) => {
      console.error('Error writing image to cache:', err);
    });
  });

  apiReq.on('error', (err) => {
    console.error('Error fetching image:', err);
    res.status(500).json({ error: 'Failed to fetch image' });
  });

  apiReq.end();
});

// GET /api/admin/cricbuzz/series – fetch international and league series from Cricbuzz
app.get('/api/admin/cricbuzz/series', requireRole('admin', 'superuser'), (req, res) => {
  const requestedType = req.query.type || 'international';
  const searchQuery = req.query.search || '';
  
  // Validate seriesType to prevent path traversal
  const allowedTypes = ['international', 'league'];
  const seriesType = allowedTypes.includes(requestedType) ? requestedType : 'international';
  
  fetchCricbuzz(`/series/v1/${seriesType}`, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch series from Cricbuzz: ' + err.message });
    }
    
    if (!data || !data.seriesMapProto) {
      return res.json({ series: [] });
    }
    
    // Flatten series from all months and filter by date range (next 6 months)
    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allSeries = [];
    data.seriesMapProto.forEach(monthGroup => {
      if (Array.isArray(monthGroup.series)) {
        monthGroup.series.forEach(s => {
          // Filter by date range
          const startDate = s.startDt ? new Date(parseInt(s.startDt)) : null;
          if (startDate && startDate >= thirtyDaysAgo && startDate <= sixMonthsLater) {
            const seriesItem = {
              id: s.id,
              name: s.name,
              startDate: startDate.toISOString().split('T')[0],
              endDate: s.endDt ? new Date(parseInt(s.endDt)).toISOString().split('T')[0] : null,
              isLiveStreamEnabled: s.isLiveStreamEnabled || false
            };
            
            // Apply search filter if provided
            if (!searchQuery || seriesItem.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              allSeries.push(seriesItem);
            }
          }
        });
      }
    });
    
    res.json({ series: allSeries });
  });
});

// GET /api/admin/cricbuzz/series/:id/matches – fetch matches for a Cricbuzz series
app.get('/api/admin/cricbuzz/series/:id/matches', requireRole('admin', 'superuser'), (req, res) => {
  const seriesId = req.params.id;
  
  fetchCricbuzz(`/series/v1/${seriesId}`, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch matches from Cricbuzz: ' + err.message });
    }
    
    if (!data || !data.matchDetails) {
      return res.json({ matches: [] });
    }
    
    const matches = [];
    data.matchDetails.forEach(detail => {
      if (detail.matchDetailsMap && Array.isArray(detail.matchDetailsMap.match)) {
        detail.matchDetailsMap.match.forEach(m => {
          const matchInfo = m.matchInfo;
          if (!matchInfo) return;
          
          // Format date from timestamp to readable format
          const scheduledAt = matchInfo.startDate 
            ? new Date(parseInt(matchInfo.startDate)).toISOString()
            : null;
          
          matches.push({
            id: matchInfo.matchId,
            name: `${matchInfo.team1.teamName} vs ${matchInfo.team2.teamName}`,
            matchDesc: matchInfo.matchDesc,
            matchFormat: matchInfo.matchFormat,
            home_team: matchInfo.team1.teamName,
            away_team: matchInfo.team2.teamName,
            scheduled_at: scheduledAt,
            venue: matchInfo.venueInfo ? `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}` : '',
            state: matchInfo.state,
            seriesName: matchInfo.seriesName
          });
        });
      }
    });
    
    res.json({ matches, seriesInfo: { name: matches[0]?.seriesName || '' } });
  });
});

// POST /api/admin/cricbuzz/import-season – create or append to season from Cricbuzz + import matches
app.post('/api/admin/cricbuzz/import-season', requireRole('admin'), (req, res) => {
  const { seasonName, matches: matchesToImport, seriesId } = req.body;
  if (!seasonName) return res.status(400).json({ error: 'seasonName required' });
  if (!Array.isArray(matchesToImport) || matchesToImport.length === 0) {
    return res.status(400).json({ error: 'At least one match required' });
  }

  const db = openDb();
  db.serialize(() => {
    // Check if season already exists
    db.get('SELECT id, cricbuzz_series_id FROM seasons WHERE name = ?', [seasonName], function(err, existingSeason) {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Failed to check existing season: ' + err.message });
      }

      let seasonId;
      let isNewSeason = false;

      const insertMatches = (sid) => {
        // Get existing matches for this season to avoid duplicates
        db.all('SELECT home_team, away_team, scheduled_at FROM matches WHERE season_id = ?', [sid], (err, existingMatches) => {
          if (err) {
            db.close();
            return res.status(500).json({ error: 'Failed to fetch existing matches: ' + err.message });
          }

          // Create a Set of existing match signatures for deduplication
          const existingMatchSet = new Set(
            existingMatches.map(m => `${m.home_team}|${m.away_team}|${m.scheduled_at}`)
          );

          const stmt = db.prepare(
            'INSERT INTO matches (season_id, home_team, away_team, scheduled_at, venue) VALUES (?, ?, ?, ?, ?)'
          );
          let inserted = 0;
          let skipped = 0;
          let errors = [];

          for (const m of matchesToImport) {
            try {
              const scheduledAt = m.scheduled_at || '';
              const matchSignature = `${m.home_team}|${m.away_team}|${scheduledAt}`;

              // Skip if match already exists
              if (existingMatchSet.has(matchSignature)) {
                skipped++;
                continue;
              }

              stmt.run([sid, m.home_team, m.away_team, scheduledAt, m.venue || '']);
              inserted++;
            } catch (e) {
              errors.push(e.message);
            }
          }

          stmt.finalize(err2 => {
            db.close();
            if (err2) return res.status(500).json({ error: 'Failed to insert matches: ' + err2.message });
            res.status(201).json({ 
              ok: true, 
              seasonId: sid, 
              seasonName, 
              inserted, 
              skipped,
              errors,
              isNewSeason,
              message: isNewSeason 
                ? `Created new season "${seasonName}" with ${inserted} match(es)` 
                : `Appended ${inserted} match(es) to existing season "${seasonName}" (${skipped} duplicate(s) skipped)`
            });
          });
        });
      };

      if (existingSeason) {
        // Season exists - append matches
        seasonId = existingSeason.id;
        console.log(`✓ Found existing season "${seasonName}" (ID: ${seasonId}), appending matches...`);
        
        // Update cricbuzz_series_id if not set
        if (seriesId && !existingSeason.cricbuzz_series_id) {
          db.run('UPDATE seasons SET cricbuzz_series_id = ? WHERE id = ?', [seriesId, seasonId], (updateErr) => {
            if (updateErr) console.error('Warning: Failed to update cricbuzz_series_id:', updateErr);
            insertMatches(seasonId);
          });
        } else {
          insertMatches(seasonId);
        }
      } else {
        // Create new season
        isNewSeason = true;
        db.run('INSERT INTO seasons (name, cricbuzz_series_id) VALUES (?, ?)', [seasonName, seriesId || null], function(insertErr) {
          if (insertErr) {
            db.close();
            return res.status(500).json({ error: 'Failed to create season: ' + insertErr.message });
          }
          seasonId = this.lastID;
          console.log(`✓ Created new season "${seasonName}" (ID: ${seasonId})`);
          insertMatches(seasonId);
        });
      }
    });
  });
});

// ── End Cricbuzz API endpoints ─────────────────────────────────────────────────

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

          // Delete all user_seasons assignments for this season
          db.run('DELETE FROM user_seasons WHERE season_id = ?', [id], function(err2b) {
            if (err2b) {
              db.close();
              return res.status(500).json({ error: 'Failed to delete user season assignments' });
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
});

// Admin: create new user
app.post('/api/admin/users', requireRole('admin'), (req, res) => {
  const { username, password, role, balance, display_name, season_ids } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  if (!password) return res.status(400).json({ error: 'password required' });

  const db = openDb();
  const userRole = role || 'picker';
  const userBalance = balance ?? 1000;
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
          // Set season-specific balance equal to the user's initial balance
          db.run('INSERT OR REPLACE INTO user_seasons (user_id, season_id, balance) VALUES (?, ?, ?)', [userId, seasonId, userBalance], () => {
            pending--;
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
  db.all('SELECT id, username, display_name, role, balance, approved, email FROM users ORDER BY id ASC', (err, rows) => {
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
    // Get user details for email
    db.get('SELECT username, email, display_name FROM users WHERE id = ?', [id], (getErr, user) => {
      if (getErr || !user) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

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

            // Insert new season assignments with per-season balance
            let completed = 0;
            season_ids.forEach(seasonId => {
              db.run('INSERT OR REPLACE INTO user_seasons (user_id, season_id, balance) VALUES (?, ?, ?)', [id, seasonId, balance], function(insErr) {
                completed++;
                if (insErr) {
                  console.log('Error assigning season:', insErr);
                }
                if (completed === season_ids.length) {
                  db.close();

                  // Process auto-loss for completed matches in newly assigned seasons
                  processAutoLossForNewSeasons(id, season_ids, (autoLossErr) => {
                    if (autoLossErr) {
                      console.error('Error processing auto-loss for new seasons:', autoLossErr);
                      // Don't fail the approval, just log the error
                    } else {
                      console.log(`✅ Auto-loss processing completed for user ${id} in ${season_ids.length} season(s)`);
                    }

                    // Send approval email to user (only if email is valid)
                    if (user.email && user.email !== 'xyz@xyz.com' && user.email.includes('@')) {
                      emailService.sendApprovalEmail(user.username, user.email, user.display_name, (emailErr) => {
                        if (emailErr) {
                          console.log('Warning: Could not send approval email:', emailErr.message);
                        }
                        res.json({ ok: true, message: 'User approved and seasons assigned' });
                      });
                    } else {
                      res.json({ ok: true, message: 'User approved and seasons assigned (no email sent - invalid email)' });
                    }
                  });
                }
              });
            });
          });
        } else {
          db.close();

          // Send approval email to user (only if email is valid)
          if (user.email && user.email !== 'xyz@xyz.com' && user.email.includes('@')) {
            emailService.sendApprovalEmail(user.username, user.email, user.display_name, (emailErr) => {
              if (emailErr) {
                console.log('Warning: Could not send approval email:', emailErr.message);
              }
              res.json({ ok: true, message: 'User approved' });
            });
          } else {
            res.json({ ok: true, message: 'User approved (no email sent - invalid email)' });
          }
        }
      });
    });
  });
});

// Admin: update user role and balance
app.put('/api/admin/users/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { role, balance, display_name, email } = req.body;

  if (!role && balance === undefined && !display_name && !email) {
    return res.status(400).json({ error: 'role, display_name, email or balance required' });
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
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
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

  // Check if user is Google-only user
  db.get('SELECT google_id, password FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }

    if (!row) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent password reset for Google-only users
    if (row.google_id && !row.password) {
      db.close();
      return res.status(400).json({
        error: 'Cannot set password for Google OAuth users. They authenticate via Google.'
      });
    }

    // Proceed with password reset
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, id], function(err2) {
      db.close();
      if (err2) {
        return res.status(500).json({ error: 'DB error: ' + err2.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ ok: true, message: 'Password reset successfully' });
    });
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

        // Delete user's season assignments
        db.run('DELETE FROM user_seasons WHERE user_id = ?', [id], function(err2) {
          if (err2) {
            db.close();
            return res.status(500).json({ error: 'Failed to delete user season assignments' });
          }

          // Now delete the user
          db.run('DELETE FROM users WHERE id = ?', [id], function(err3) {
            db.close();
            if (err3) {
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
});

// Signup endpoint: create pending user
app.post('/api/signup', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (!email || email.trim() === '') {
    return res.status(400).json({ error: 'email is required' });
  }
  // Validate email format (basic validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'invalid email format' });
  }

  // Use username as default display_name
  const finalDisplayName = username;
  const db = openDb();
  db.run('INSERT INTO users (username, password, display_name, email, role, balance, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [username, password, finalDisplayName, email, 'picker', 0], function(err) {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'User already exists or DB error' });
      }

      // Load email settings ONCE, then send both emails with same settings
      // This avoids race conditions with multiple DB connections
      emailService.getEmailSettings((settingsErr, settings) => {
        if (settingsErr || !settings) {
          console.log('[SIGNUP] Email settings not configured – skipping both emails');
          db.close();
          return res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
        }

        const transporter = emailService.createTransporter(settings);
        if (!transporter) {
          console.log('[SIGNUP] Email transporter could not be created – skipping both emails');
          db.close();
          return res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
        }

        const fromEmail = settings.from || settings.user;
        const appLink = process.env.NODE_ENV === 'production'
          ? 'https://cricketmela.pages.dev'
          : 'http://localhost:5173';

        // Email 1: Confirmation email to the user who just signed up
        const confirmMailOptions = {
          from: fromEmail,
          to: email,
          subject: 'Welcome to Cricket Mela – Signup Request Received',
          html: `
            <h2>Welcome to Cricket Mela! 🏏</h2>
            <p>Hello <strong>${finalDisplayName}</strong>,</p>
            <p>Thank you for signing up! Your request has been received and is pending admin approval.</p>
            <br/>
            <p><strong>Your Details:</strong></p>
            <ul>
              <li><strong>Username:</strong> ${username}</li>
              <li><strong>Email:</strong> ${email}</li>
            </ul>
            <br/>
            <p>You will receive another email once your account is approved. After approval, you can log in and start placing bets on your favourite IPL matches!</p>
            <br/>
            <p><a href="${appLink}" style="background-color:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Visit Cricket Mela</a></p>
            <br/>
            <p style="color:#999;font-size:12px;">If you did not sign up for this account, please ignore this email.</p>
          `
        };

        console.log(`[SIGNUP] Sending confirmation email to user: ${email}`);
        transporter.sendMail(confirmMailOptions, (confirmErr, confirmInfo) => {
          if (confirmErr) {
            console.log(`[SIGNUP] ❌ Failed to send confirmation email to ${email}:`, confirmErr.message);
          } else {
            console.log(`[SIGNUP] ✅ Confirmation email sent to ${email}:`, confirmInfo.response);
          }

          // Email 2: Notification to all admin users
          // Get admin emails from the same already-open DB connection
          db.all("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != 'xyz@xyz.com'", (adminQueryErr, adminRows) => {
            db.close();

            const approvalLink = process.env.NODE_ENV === 'production'
              ? 'https://cricketmela.pages.dev/?page=admin&adminTab=users'
              : 'http://localhost:5173/?page=admin&adminTab=users';

            const adminEmails = adminRows && adminRows.length > 0
              ? adminRows.map(r => r.email).filter(Boolean)
              : [fromEmail]; // fallback to sender if no admin emails configured

            const adminMailOptions = {
              from: fromEmail,
              to: adminEmails.join(', '),
              subject: `New User Signup – ${username}`,
              html: `
                <h2>New User Signup Request</h2>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Display Name:</strong> ${finalDisplayName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <br/>
                <p>Please log in to the admin panel to approve or reject this user.</p>
                <p><a href="${approvalLink}" style="background-color:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">View Pending Users</a></p>
              `
            };

            console.log(`[SIGNUP] Sending admin notification to: ${adminEmails.join(', ')}`);
            transporter.sendMail(adminMailOptions, (adminErr, adminInfo) => {
              if (adminErr) {
                console.log(`[SIGNUP] ❌ Failed to send admin notification:`, adminErr.message);
              } else {
                console.log(`[SIGNUP] ✅ Admin notification sent to ${adminEmails.length} admin(s):`, adminInfo.response);
              }
              res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
            });
          });
        });
      });
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

// ========== Password Reset Routes ==========

// POST /api/forgot-password — request a reset link
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  const db = openDb();
  // Use db.all() to handle the case where multiple users share the same email
  // (e.g. one ID/password account + one Google OAuth account with same email)
  db.all(
    "SELECT id, username, display_name, email, google_id, password FROM users WHERE email = ? COLLATE NOCASE AND approved = 1",
    [email.trim()],
    (err, users) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }

      // No account found — return generic message (don't reveal whether email exists)
      if (!users || users.length === 0) {
        db.close();
        return res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
      }

      // Find the password-based user (has a password set, not Google-only)
      const passwordUser = users.find(u => u.password && u.password.trim() !== '');
      const googleOnlyUsers = users.filter(u => u.google_id && (!u.password || u.password.trim() === ''));

      // If only Google accounts exist for this email — tell them explicitly
      if (!passwordUser && googleOnlyUsers.length > 0) {
        db.close();
        return res.status(400).json({
          error: 'This email is linked to a Google account. Please use "Sign in with Google" to log in — password reset is not available for Google accounts.'
        });
      }

      // Use the password-based user for reset
      const user = passwordUser;

      // Generate a secure random token (hex string)
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      // Invalidate any existing unused tokens for this user
      db.run('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id], (updateErr) => {
        if (updateErr) console.log('[PASSWORD RESET] Warning: could not invalidate old tokens:', updateErr);

        // Insert new token
        db.run(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
          [user.id, token, expiresAt],
          (insertErr) => {
            db.close();
            if (insertErr) {
              return res.status(500).json({ error: 'Failed to create reset token' });
            }

            // Send the email
            emailService.sendPasswordResetEmail(
              user.username,
              user.email,
              user.display_name || user.username,
              token,
              (emailErr) => {
                if (emailErr) {
                  console.log('[PASSWORD RESET] Email failed:', emailErr.message);
                  // Still return success (don't reveal email config issues to users)
                }
                res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
              }
            );
          }
        );
      });
    }
  );
});

// POST /api/reset-password/:token — submit new password
app.post('/api/reset-password/:token', (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) return res.status(400).json({ error: 'Reset token is required' });
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = openDb();
  db.get(
    'SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.username FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.token = ?',
    [token],
    (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!row) {
        db.close();
        return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      }
      if (row.used) {
        db.close();
        return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
      }
      if (new Date() > new Date(row.expires_at)) {
        db.close();
        return res.status(400).json({ error: 'Reset link has expired (valid for 30 minutes). Please request a new one.' });
      }

      // Update password and mark token as used
      db.run('UPDATE users SET password = ? WHERE id = ?', [password, row.user_id], (updateErr) => {
        if (updateErr) {
          db.close();
          return res.status(500).json({ error: 'Failed to update password' });
        }
        db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id], (tokenErr) => {
          db.close();
          if (tokenErr) console.log('[PASSWORD RESET] Warning: could not mark token as used:', tokenErr);
          console.log(`[PASSWORD RESET] Password reset successfully for user: ${row.username}`);
          res.json({ ok: true, message: 'Password has been reset successfully. You can now log in.' });
        });
      });
    }
  );
});

// GET /api/reset-password/validate/:token — check if token is valid (for frontend)
app.get('/api/reset-password/validate/:token', (req, res) => {
  const { token } = req.params;
  const db = openDb();
  db.get(
    'SELECT prt.expires_at, prt.used, u.username FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.token = ?',
    [token],
    (err, row) => {
      db.close();
      if (err) return res.status(500).json({ valid: false, error: 'DB error' });
      if (!row) return res.json({ valid: false, error: 'Invalid reset link' });
      if (row.used) return res.json({ valid: false, error: 'This link has already been used' });
      if (new Date() > new Date(row.expires_at)) return res.json({ valid: false, error: 'Reset link has expired' });
      res.json({ valid: true, username: row.username });
    }
  );
});

// ========== Google OAuth Routes ==========

// Google OAuth login - initiate authentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback - handle after Google authentication
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
  (req, res) => {
    // Check if user is approved
    if (req.user.approved === 0) {
      // User account pending approval
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? 'https://cricketmela.pages.dev'
        : 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?error=pending_approval`);
    }

    // Success - redirect to frontend with user data
    const userData = encodeURIComponent(JSON.stringify({
      id: req.user.id,
      username: req.user.username,
      display_name: req.user.display_name,
      role: req.user.role,
      balance: req.user.balance
    }));

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://cricketmela.pages.dev'
      : 'http://localhost:5173';

    res.redirect(`${frontendUrl}/?auth=success&user=${userData}`);
  }
);

// Google OAuth failure handler
app.get('/auth/google/failure', (req, res) => {
  const frontendUrl = process.env.NODE_ENV === 'production'
    ? 'https://cricketmela.pages.dev'
    : 'http://localhost:5173';
  res.redirect(`${frontendUrl}/?error=auth_failed`);
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.json({ ok: true, message: 'Logged out successfully' });
    });
  });
});

// Check authentication status
app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        display_name: req.user.display_name,
        role: req.user.role,
        balance: req.user.balance,
        email: req.user.email
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ========== End Google OAuth Routes ==========

app.get('/api/standings', (req, res) => {
  const db = openDb();
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;

  if (seasonId) {
    // Season-specific standings: use user_seasons.balance for that season
    db.all(`
      SELECT u.id, u.username, u.display_name, u.role, us.balance
      FROM users u
      JOIN user_seasons us ON us.user_id = u.id
      WHERE us.season_id = ? AND u.role != 'admin' AND u.approved = 1
      ORDER BY us.balance DESC
    `, [seasonId], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows || []);
    });
  } else {
    // Overall standings: sum of all season balances (only for currently existing seasons)
    db.all(`
      SELECT u.id, u.username, u.display_name, u.role,
        COALESCE(
          (SELECT SUM(us.balance)
           FROM user_seasons us
           JOIN seasons s ON s.id = us.season_id
           WHERE us.user_id = u.id),
          u.balance
        ) as balance
      FROM users u
      WHERE u.role != 'admin' AND u.approved = 1
      ORDER BY balance DESC
    `, (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows || []);
    });
  }
});

// Get user's vote history
app.get('/api/users/:userId/votes', (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();
  // Only show votes for seasons the user currently has access to
  db.all(`
    SELECT v.id, v.match_id, v.team, v.points, v.created_at,
           m.home_team, m.away_team, m.winner, m.scheduled_at,
           m.season_id, s.name as season_name
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    LEFT JOIN seasons s ON s.id = m.season_id
    JOIN user_seasons us ON us.season_id = m.season_id AND us.user_id = v.user_id
    WHERE v.user_id = ?
    ORDER BY m.scheduled_at ASC
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

// Admin: Get vote history for all users or specific user
app.get('/api/admin/vote-history', requireRole('admin'), (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const db = openDb();
  
  let query, params;
  if (userId) {
    // Get votes for specific user
    query = `
      SELECT v.id, v.match_id, v.team, v.points, v.created_at, v.user_id,
             u.username, u.display_name,
             m.home_team, m.away_team, m.winner, m.scheduled_at,
             m.season_id, s.name as season_name
      FROM votes v
      JOIN matches m ON v.match_id = m.id
      LEFT JOIN seasons s ON s.id = m.season_id
      JOIN users u ON u.id = v.user_id
      WHERE v.user_id = ?
      ORDER BY m.scheduled_at ASC
    `;
    params = [userId];
  } else {
    // Get all votes across all users
    query = `
      SELECT v.id, v.match_id, v.team, v.points, v.created_at, v.user_id,
             u.username, u.display_name,
             m.home_team, m.away_team, m.winner, m.scheduled_at,
             m.season_id, s.name as season_name
      FROM votes v
      JOIN matches m ON v.match_id = m.id
      LEFT JOIN seasons s ON s.id = m.season_id
      JOIN users u ON u.id = v.user_id
      ORDER BY m.scheduled_at ASC
    `;
    params = [];
  }
  
  db.all(query, params, (err, rows) => {
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

// Admin: Get analytics for all non-admin users or a specific user
app.get('/api/admin/analytics', requireRole('admin'), (req, res) => {
  const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
  const db = openDb();

  let query = `
    SELECT v.id, v.match_id, v.team, v.points, v.created_at, v.user_id,
           u.username, u.display_name, u.role,
           m.home_team, m.away_team, m.winner, m.scheduled_at,
           m.season_id, s.name as season_name
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    LEFT JOIN seasons s ON s.id = m.season_id
    JOIN users u ON u.id = v.user_id
    WHERE u.role != 'admin'
  `;
  const params = [];

  if (requestedUserId) {
    query += ' AND v.user_id = ?';
    params.push(requestedUserId);
  }

  query += ' ORDER BY m.scheduled_at ASC, v.id ASC';

  function parseAnalyticsDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(?::\d{2})?$/);
    if (isoNoTz) {
      const date = new Date(`${raw}Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;

    if (raw.includes('T') && !raw.match(/^\d{4}-/)) {
      const [datePart, timePart] = raw.split('T');
      const dateStr = datePart.includes('-20') ? datePart : datePart.replace(/-(\d{2})$/, '-20$1');
      const parsed = new Date(`${dateStr} ${timePart}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  function monthKeyFromScheduledAt(value) {
    const parsed = parseAnalyticsDate(value);
    if (!parsed) return 'Unknown';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }

    if (!rows || rows.length === 0) {
      db.close();
      return res.json({
        overview: {
          total_votes: 0,
          won: 0,
          lost: 0,
          pending: 0,
          win_rate: 0,
          total_bet: 0,
          avg_bet: 0,
          net_profit: 0,
          roi: 0,
        },
        teams: [],
        timeline: [],
        streaks: {
          current_streak: 0,
          current_losing_streak: 0,
          best_winning_streak: 0,
        },
        patterns: {
          by_points: [],
          by_day: [],
        },
      });
    }

    const matchIds = [...new Set(rows.map(row => row.match_id))];
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
        (totalsRows || []).forEach(total => {
          if (!totalsByMatch[total.match_id]) totalsByMatch[total.match_id] = {};
          totalsByMatch[total.match_id][total.team] = Number(total.total) || 0;
        });

        const withNet = rows.map(vote => {
          if (!vote.winner) return { ...vote, net_points: null, total_payout: null };

          const totals = totalsByMatch[vote.match_id] || {};
          const totalWinner = Number(totals[vote.winner] || 0);
          const totalLoser = Object.keys(totals).reduce((sum, team) => {
            return team === vote.winner ? sum : sum + Number(totals[team] || 0);
          }, 0);

          if (vote.team === vote.winner) {
            if (totalWinner === 0 || totalLoser === 0) {
              return { ...vote, net_points: 0, total_payout: Number(vote.points) };
            }
            const share = (Number(vote.points) / totalWinner) * totalLoser;
            const netPoints = Number(share.toFixed(2));
            return {
              ...vote,
              net_points: netPoints,
              total_payout: Number((Number(vote.points) + netPoints).toFixed(2)),
            };
          }

          return { ...vote, net_points: -Number(vote.points), total_payout: 0 };
        });

        const settledVotes = withNet.filter(vote => vote.winner);
        const totalVotes = withNet.length;
        const won = settledVotes.filter(vote => vote.team === vote.winner).length;
        const lost = settledVotes.filter(vote => vote.team !== vote.winner).length;
        const pending = totalVotes - won - lost;
        const totalBet = withNet.reduce((sum, vote) => sum + Number(vote.points || 0), 0);
        const netProfit = settledVotes.reduce((sum, vote) => sum + Number(vote.net_points || 0), 0);

        const overview = {
          total_votes: totalVotes,
          won,
          lost,
          pending,
          win_rate: totalVotes > 0 ? Number(((won / totalVotes) * 100).toFixed(1)) : 0,
          total_bet: totalBet,
          avg_bet: totalVotes > 0 ? Math.round(totalBet / totalVotes) : 0,
          net_profit: Math.round(netProfit),
          roi: totalBet > 0 ? Number(((netProfit / totalBet) * 100).toFixed(1)) : 0,
        };

        const teamMap = {};
        withNet.forEach(vote => {
          if (!teamMap[vote.team]) {
            teamMap[vote.team] = {
              team: vote.team,
              votes: 0,
              won: 0,
              lost: 0,
              total_bet: 0,
              net_profit: 0,
            };
          }

          const teamStats = teamMap[vote.team];
          teamStats.votes += 1;
          teamStats.total_bet += Number(vote.points || 0);
          if (vote.winner && vote.team === vote.winner) teamStats.won += 1;
          if (vote.winner && vote.team !== vote.winner) teamStats.lost += 1;
          if (vote.winner) teamStats.net_profit += Number(vote.net_points || 0);
        });

        const teams = Object.values(teamMap).map(team => ({
          ...team,
          net_profit: Math.round(team.net_profit),
          win_rate: team.votes > 0 ? ((team.won / team.votes) * 100).toFixed(1) : 0,
          roi: team.total_bet > 0 ? ((team.net_profit / team.total_bet) * 100).toFixed(1) : 0,
        }));

        const timelineMap = {};
        withNet.forEach(vote => {
          const month = monthKeyFromScheduledAt(vote.scheduled_at);
          if (!timelineMap[month]) {
            timelineMap[month] = { month, votes: 0, won: 0, net_profit: 0 };
          }
          timelineMap[month].votes += 1;
          if (vote.winner && vote.team === vote.winner) timelineMap[month].won += 1;
          if (vote.winner) timelineMap[month].net_profit += Number(vote.net_points || 0);
        });

        const timeline = Object.values(timelineMap)
          .map(item => ({ ...item, net_profit: Math.round(item.net_profit) }))
          .sort((left, right) => left.month.localeCompare(right.month));

        const settledSorted = [...settledVotes].sort((left, right) => {
          const leftDate = parseAnalyticsDate(left.scheduled_at);
          const rightDate = parseAnalyticsDate(right.scheduled_at);
          if (!leftDate && !rightDate) return 0;
          if (!leftDate) return 1;
          if (!rightDate) return -1;
          return leftDate - rightDate;
        });

        let currentRun = 0;
        let currentIsWin = null;
        for (let index = settledSorted.length - 1; index >= 0; index -= 1) {
          const isWin = settledSorted[index].team === settledSorted[index].winner;
          if (currentIsWin === null) {
            currentIsWin = isWin;
            currentRun = 1;
            continue;
          }
          if (currentIsWin === isWin) {
            currentRun += 1;
          } else {
            break;
          }
        }

        let bestWinningStreak = 0;
        let runningWinningStreak = 0;
        settledSorted.forEach(vote => {
          if (vote.team === vote.winner) {
            runningWinningStreak += 1;
            bestWinningStreak = Math.max(bestWinningStreak, runningWinningStreak);
          } else {
            runningWinningStreak = 0;
          }
        });

        const streaks = {
          current_streak: currentIsWin === true ? currentRun : 0,
          current_losing_streak: currentIsWin === false ? currentRun : 0,
          best_winning_streak: bestWinningStreak,
        };

        const pointMap = {};
        const dayMap = {
          Sunday: { day: 'Sunday', votes: 0, won: 0 },
          Monday: { day: 'Monday', votes: 0, won: 0 },
          Tuesday: { day: 'Tuesday', votes: 0, won: 0 },
          Wednesday: { day: 'Wednesday', votes: 0, won: 0 },
          Thursday: { day: 'Thursday', votes: 0, won: 0 },
          Friday: { day: 'Friday', votes: 0, won: 0 },
          Saturday: { day: 'Saturday', votes: 0, won: 0 },
        };

        settledSorted.forEach(vote => {
          const pointsKey = Number(vote.points || 0);
          if (!pointMap[pointsKey]) {
            pointMap[pointsKey] = { points: pointsKey, count: 0, won: 0 };
          }
          pointMap[pointsKey].count += 1;
          if (vote.team === vote.winner) pointMap[pointsKey].won += 1;

          const parsed = parseAnalyticsDate(vote.scheduled_at);
          if (parsed) {
            const dayName = parsed.toLocaleDateString('en-US', { weekday: 'long' });
            if (dayMap[dayName]) {
              dayMap[dayName].votes += 1;
              if (vote.team === vote.winner) dayMap[dayName].won += 1;
            }
          }
        });

        const patterns = {
          by_points: Object.values(pointMap)
            .sort((left, right) => left.points - right.points)
            .map(item => ({
              ...item,
              win_rate: item.count > 0 ? ((item.won / item.count) * 100).toFixed(1) : 0,
            })),
          by_day: Object.values(dayMap)
            .filter(item => item.votes > 0)
            .map(item => ({
              ...item,
              win_rate: item.votes > 0 ? ((item.won / item.votes) * 100).toFixed(1) : 0,
            })),
        };

        res.json({ overview, teams, timeline, streaks, patterns });
      }
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get comprehensive user analytics overview
app.get('/api/analytics/overview/:userId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();

  // Overall stats
  const overallQuery = `
    SELECT 
      COUNT(*) as total_votes,
      COUNT(CASE WHEN v.team = m.winner THEN 1 END) as won,
      COUNT(CASE WHEN m.winner IS NOT NULL AND v.team != m.winner THEN 1 END) as lost,
      SUM(v.points) as total_bet,
      AVG(v.points) as avg_bet
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ?
  `;

  db.get(overallQuery, [userId], (err, overall) => {
    if (err) { db.close(); return res.status(500).json({ error: err.message }); }

    // Calculate net profit for each vote
    db.all(`
      SELECT v.match_id, v.points, v.team, m.winner
      FROM votes v
      JOIN matches m ON v.match_id = m.id
      WHERE v.user_id = ? AND m.winner IS NOT NULL
    `, [userId], (err2, userVotes) => {
      if (err2) { db.close(); return res.status(500).json({ error: err2.message }); }

      if (userVotes.length === 0) {
        db.close();
        return res.json({
          total_votes: overall.total_votes || 0,
          won: overall.won || 0,
          lost: overall.lost || 0,
          pending: (overall.total_votes || 0) - (overall.won || 0) - (overall.lost || 0),
          win_rate: 0,
          total_bet: overall.total_bet || 0,
          avg_bet: Math.round(overall.avg_bet || 0),
          net_profit: 0,
          roi: 0
        });
      }

      const matchIds = [...new Set(userVotes.map(v => v.match_id))];
      const placeholders = matchIds.map(() => '?').join(',');

      db.all(`
        SELECT match_id, team, SUM(points) as total
        FROM votes
        WHERE match_id IN (${placeholders})
        GROUP BY match_id, team
      `, matchIds, (err3, totals) => {
        db.close();
        if (err3) return res.status(500).json({ error: err3.message });

        const totalsByMatch = {};
        totals.forEach(t => {
          if (!totalsByMatch[t.match_id]) totalsByMatch[t.match_id] = {};
          totalsByMatch[t.match_id][t.team] = Number(t.total);
        });

        let netProfit = 0;
        userVotes.forEach(v => {
          if (!v.winner) return;
          const totals = totalsByMatch[v.match_id] || {};
          const totalWinner = totals[v.winner] || 0;
          const totalLoser = Object.keys(totals).reduce((sum, team) => 
            team === v.winner ? sum : sum + (totals[team] || 0), 0);

          if (v.team === v.winner && totalWinner > 0) {
            const share = (v.points / totalWinner) * totalLoser;
            netProfit += Math.round(share);
          } else if (v.team !== v.winner) {
            netProfit -= v.points;
          }
        });

        const winRate = overall.total_votes > 0 ? (overall.won / overall.total_votes * 100).toFixed(1) : 0;
        const roi = overall.total_bet > 0 ? ((netProfit / overall.total_bet) * 100).toFixed(1) : 0;

        res.json({
          total_votes: overall.total_votes || 0,
          won: overall.won || 0,
          lost: overall.lost || 0,
          pending: (overall.total_votes || 0) - (overall.won || 0) - (overall.lost || 0),
          win_rate: parseFloat(winRate),
          total_bet: overall.total_bet || 0,
          avg_bet: Math.round(overall.avg_bet || 0),
          net_profit: netProfit,
          roi: parseFloat(roi)
        });
      });
    });
  });
});

// Team-wise performance analytics
app.get('/api/analytics/teams/:userId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();

  db.all(`
    SELECT 
      v.team,
      COUNT(*) as votes,
      COUNT(CASE WHEN v.team = m.winner THEN 1 END) as won,
      COUNT(CASE WHEN m.winner IS NOT NULL AND v.team != m.winner THEN 1 END) as lost,
      SUM(v.points) as total_bet,
      GROUP_CONCAT(v.match_id || ':' || v.points || ':' || COALESCE(m.winner, '')) as match_data
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ?
    GROUP BY v.team
  `, [userId], (err, teams) => {
    if (err) { db.close(); return res.status(500).json({ error: err.message }); }

    if (!teams || teams.length === 0) {
      db.close();
      return res.json([]);
    }

    const allMatchIds = [];
    teams.forEach(t => {
      if (t.match_data) {
        const matches = t.match_data.split(',');
        matches.forEach(m => {
          const [matchId] = m.split(':');
          if (matchId) allMatchIds.push(Number(matchId));
        });
      }
    });

    const uniqueMatchIds = [...new Set(allMatchIds)];
    if (uniqueMatchIds.length === 0) {
      db.close();
      return res.json(teams.map(t => ({
        team: t.team,
        votes: t.votes,
        won: t.won,
        lost: t.lost,
        win_rate: t.votes > 0 ? ((t.won / t.votes) * 100).toFixed(1) : 0,
        total_bet: t.total_bet,
        net_profit: 0,
        roi: 0
      })));
    }

    const placeholders = uniqueMatchIds.map(() => '?').join(',');
    db.all(`
      SELECT match_id, team, SUM(points) as total
      FROM votes
      WHERE match_id IN (${placeholders})
      GROUP BY match_id, team
    `, uniqueMatchIds, (err2, voteTotals) => {
      db.close();
      if (err2) return res.status(500).json({ error: err2.message });

      const totalsByMatch = {};
      voteTotals.forEach(v => {
        if (!totalsByMatch[v.match_id]) totalsByMatch[v.match_id] = {};
        totalsByMatch[v.match_id][v.team] = Number(v.total);
      });

      const result = teams.map(t => {
        let netProfit = 0;
        if (t.match_data) {
          const matches = t.match_data.split(',');
          matches.forEach(m => {
            const [matchId, points, winner] = m.split(':');
            if (!winner || winner === '') return;
            
            const totals = totalsByMatch[Number(matchId)] || {};
            const totalWinner = totals[winner] || 0;
            const totalLoser = Object.keys(totals).reduce((sum, team) => 
              team === winner ? sum : sum + (totals[team] || 0), 0);

            if (t.team === winner && totalWinner > 0) {
              const share = (Number(points) / totalWinner) * totalLoser;
              netProfit += Math.round(share);
            } else if (t.team !== winner) {
              netProfit -= Number(points);
            }
          });
        }

        return {
          team: t.team,
          votes: t.votes,
          won: t.won,
          lost: t.lost,
          win_rate: t.votes > 0 ? ((t.won / t.votes) * 100).toFixed(1) : 0,
          total_bet: t.total_bet,
          net_profit: netProfit,
          roi: t.total_bet > 0 ? ((netProfit / t.total_bet) * 100).toFixed(1) : 0
        };
      });

      res.json(result);
    });
  });
});

// Monthly performance timeline
app.get('/api/analytics/timeline/:userId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();

  db.all(`
    SELECT 
      v.match_id,
      v.points,
      v.team,
      m.winner,
      strftime('%Y-%m', m.scheduled_at) as month
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ?
    ORDER BY m.scheduled_at ASC
  `, [userId], (err, votes) => {
    if (err) { db.close(); return res.status(500).json({ error: err.message }); }

    if (!votes || votes.length === 0) {
      db.close();
      return res.json([]);
    }

    const matchIds = [...new Set(votes.map(v => v.match_id))];
    const placeholders = matchIds.map(() => '?').join(',');

    db.all(`
      SELECT match_id, team, SUM(points) as total
      FROM votes
      WHERE match_id IN (${placeholders})
      GROUP BY match_id, team
    `, matchIds, (err2, totals) => {
      db.close();
      if (err2) return res.status(500).json({ error: err2.message });

      const totalsByMatch = {};
      totals.forEach(t => {
        if (!totalsByMatch[t.match_id]) totalsByMatch[t.match_id] = {};
        totalsByMatch[t.match_id][t.team] = Number(t.total);
      });

      const monthlyData = {};
      votes.forEach(v => {
        if (!v.month) return;
        if (!monthlyData[v.month]) {
          monthlyData[v.month] = { month: v.month, votes: 0, won: 0, net_profit: 0 };
        }

        monthlyData[v.month].votes++;
        
        if (v.winner) {
          if (v.team === v.winner) {
            monthlyData[v.month].won++;
            const totals = totalsByMatch[v.match_id] || {};
            const totalWinner = totals[v.winner] || 0;
            const totalLoser = Object.keys(totals).reduce((sum, team) => 
              team === v.winner ? sum : sum + (totals[team] || 0), 0);
            if (totalWinner > 0) {
              const share = (v.points / totalWinner) * totalLoser;
              monthlyData[v.month].net_profit += Math.round(share);
            }
          } else {
            monthlyData[v.month].net_profit -= v.points;
          }
        }
      });

      res.json(Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)));
    });
  });
});

// Streak calculation
app.get('/api/analytics/streaks/:userId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();

  db.all(`
    SELECT 
      v.match_id,
      m.scheduled_at,
      v.team,
      m.winner,
      CASE WHEN v.team = m.winner THEN 1 ELSE 0 END as won
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ? AND m.winner IS NOT NULL
    ORDER BY m.scheduled_at ASC
  `, [userId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });

    if (!rows || rows.length === 0) {
      return res.json({
        current_streak: 0,
        current_losing_streak: 0,
        best_winning_streak: 0
      });
    }

    let currentStreak = 0;
    let maxStreak = 0;
    let lastWon = null;

    // Calculate current streak (from most recent)
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].won === 1) {
        if (lastWon === null) {
          lastWon = true;
          currentStreak = 1;
        } else if (lastWon === true) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        if (lastWon === null) {
          lastWon = false;
          currentStreak = 1;
        } else if (lastWon === false) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate max winning streak
    let streak = 0;
    rows.forEach(row => {
      if (row.won === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    });

    res.json({
      current_streak: lastWon === true ? currentStreak : 0,
      current_losing_streak: lastWon === false ? currentStreak : 0,
      best_winning_streak: maxStreak
    });
  });
});

// Betting patterns analysis
app.get('/api/analytics/patterns/:userId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();

  const pointsQuery = `
    SELECT 
      v.points,
      COUNT(*) as count,
      COUNT(CASE WHEN v.team = m.winner THEN 1 END) as won
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ? AND m.winner IS NOT NULL
    GROUP BY v.points
    ORDER BY v.points
  `;

  const dayQuery = `
    SELECT 
      CASE CAST(strftime('%w', m.scheduled_at) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day,
      COUNT(*) as votes,
      COUNT(CASE WHEN v.team = m.winner THEN 1 END) as won
    FROM votes v
    JOIN matches m ON v.match_id = m.id
    WHERE v.user_id = ? AND m.winner IS NOT NULL AND m.scheduled_at IS NOT NULL
    GROUP BY CAST(strftime('%w', m.scheduled_at) AS INTEGER)
  `;

  db.all(pointsQuery, [userId], (err, pointsData) => {
    if (err) { db.close(); return res.status(500).json({ error: err.message }); }

    db.all(dayQuery, [userId], (err2, dayData) => {
      db.close();
      if (err2) return res.status(500).json({ error: err2.message });

      const byPoints = (pointsData || []).map(p => ({
        points: p.points,
        count: p.count,
        won: p.won,
        win_rate: p.count > 0 ? ((p.won / p.count) * 100).toFixed(1) : 0
      }));

      res.json({
        by_points: byPoints,
        by_day: dayData || []
      });
    });
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
    db.get('SELECT season_id, winner FROM matches WHERE id = ?', [id], (errM, matchRow) => {
      if (errM) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!matchRow) { db.close(); return res.status(404).json({ error: 'Match not found' }); }

      db.all('SELECT user_id, points, team FROM votes WHERE match_id = ?', [id], (err, votes) => {
        if (err) { db.close(); return res.status(500).json({ error: 'DB error: ' + err.message }); }

        const doDelete = () => {
          db.run('DELETE FROM votes WHERE match_id = ?', [id], function(err3) {
            if (err3) { db.close(); return res.status(500).json({ error: 'Failed to delete votes: ' + err3.message }); }
            db.run('DELETE FROM matches WHERE id = ?', [id], function(err4) {
              db.close();
              if (err4) return res.status(500).json({ error: 'Failed to delete match: ' + err4.message });
              res.json({ ok: true, message: 'Match deleted successfully' });
            });
          });
        };

        // If winner was set, reverse the season balance changes first
        if (matchRow.winner) {
          const winner = matchRow.winner;
          const seasonId = matchRow.season_id;
          const winnerVotes = votes.filter(v => v.team === winner);
          const loserVotes = votes.filter(v => v.team !== winner);
          const totalWinner = winnerVotes.reduce((s, v) => s + v.points, 0);
          const totalLoser = loserVotes.reduce((s, v) => s + v.points, 0);
          let done = 0;
          const total = winnerVotes.length + loserVotes.length;
          if (total === 0) { doDelete(); return; }
          winnerVotes.forEach(v => {
            const gain = Math.round((v.points / totalWinner) * totalLoser);
            db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
              [gain, v.user_id, seasonId], () => { done++; if (done === total) doDelete(); });
          });
          loserVotes.forEach(v => {
            db.run('UPDATE user_seasons SET balance = balance + ? WHERE user_id = ? AND season_id = ?',
              [v.points, v.user_id, seasonId], () => { done++; if (done === total) doDelete(); });
          });
        } else {
          // No winner set — votes never touched balances, just delete
          doDelete();
        }
      });
    });
  });
});

// Admin set match winner and distribute points (using season balances)
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
      const seasonId = match.season_id;

      // Get all users assigned to this season (non-admin, approved)
      db.all(`
        SELECT DISTINCT u.id, u.username
        FROM users u
        JOIN user_seasons us ON us.user_id = u.id
        WHERE us.season_id = ? AND u.role != 'admin' AND u.approved = 1
      `, [seasonId], (errUsers, assignedUsers) => {
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

                // update match winner first
                db.run('UPDATE matches SET winner = ? WHERE id = ?', [winner, id], function(err3) {
                  if (err3) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                  // Deduct loser season balances
                  db.all('SELECT user_id, points FROM votes WHERE match_id = ? AND team != ?', [id, winner], (errLosers, loserVotes) => {
                    if (errLosers) { db.close(); return res.status(500).json({ error: 'DB error' }); }

                    // Auto-loss users already had their balance deducted — skip them here to avoid double-charging
                    const autoLossUserIds = new Set(nonVotedUsers.map(u => u.id));
                    const realLoserVotes = (loserVotes || []).filter(v => !autoLossUserIds.has(v.user_id));

                    if (totalLoser === 0 || totalWinner === 0) {
                      // Deduct losers even if no winners (or no losers)
                      if (realLoserVotes.length === 0) {
                        db.close();
                        return res.json({ ok: true, distributed: 0, autoLoss: nonVotedUsers.length });
                      }
                      // Still deduct real loser season balances (auto-loss already deducted above)
                      let losersProcessed = 0;
                      realLoserVotes.forEach(v => {
                        db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
                          [v.points, v.user_id, seasonId], () => { losersProcessed++; if (losersProcessed === realLoserVotes.length) { db.close(); return res.json({ ok: true, distributed: 0, autoLoss: nonVotedUsers.length }); } });
                      });
                      return;
                    }

                    // Deduct real loser season balances (auto-loss users already deducted)
                    const loserVotesToDeduct = realLoserVotes;
                    let losersProcessed = 0;
                    const afterLosersDeducted = () => {
                      // For each winner vote, compute net gain = (stake/totalWinner)*totalLoser (rounded)
                      db.all('SELECT id, user_id, points FROM votes WHERE match_id = ? AND team = ?', [id, winner], (err4, winnerVotes) => {
                        if (err4) { db.close(); return res.status(500).json({ error: 'DB error' }); }
                        const payouts = winnerVotes.map(v => ({
                          user_id: v.user_id,
                          gain: Math.round((v.points / totalWinner) * totalLoser)
                        }));
                        const ops = payouts.length;
                        let done = 0;
                        payouts.forEach(p => {
                          // Add winner's gain to their season balance
                          db.run('UPDATE user_seasons SET balance = balance + ? WHERE user_id = ? AND season_id = ?',
                            [p.gain, p.user_id, seasonId], function(err5) {
                              if (err5) console.error('Error updating season balance for winner', err5);
                              done++;
                              if (done === ops) {
                                db.close();
                                return res.json({ ok: true, distributed: totalLoser, autoLoss: nonVotedUsers.length });
                              }
                            });
                        });
                      });
                    };

                    if (loserVotesToDeduct.length === 0) {
                      afterLosersDeducted();
                      return;
                    }
                    loserVotesToDeduct.forEach(v => {
                      db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
                        [v.points, v.user_id, seasonId], () => {
                          losersProcessed++;
                          if (losersProcessed === loserVotesToDeduct.length) afterLosersDeducted();
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

          // Create auto-loss votes and deduct season balances (allow negative)
          nonVotedUsers.forEach(user => {
            const autoPoints = 10;
            db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
              [autoPoints, user.id, seasonId], (errBal) => {
                if (errBal) console.error('Error deducting auto-loss season balance:', errBal);
                db.run('INSERT INTO votes (match_id, user_id, team, points, is_auto_loss) VALUES (?, ?, ?, ?, 1)',
                  [id, user.id, losingTeam, autoPoints], (errVote) => {
                    if (errVote) console.error('Error creating auto-loss vote:', errVote);
                    autoVotesPending--;
                    if (autoVotesPending === 0) continueWithDistribution();
                  });
              });
          });
        });
      });
    });
  });
});

// Admin: Clear votes and odds for a specific match
// Since votes no longer deduct balance on placement, we just delete the vote records.
// If the match already has a winner (balance was already settled), we also reverse the season balance changes.
app.post('/api/admin/matches/:id/clear-votes', requireRole('admin'), (req, res) => {
  const matchId = Number(req.params.id);
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  const db = openDb();
  db.serialize(() => {
    // Get match info (to check if winner already set and get season)
    db.get('SELECT season_id, winner FROM matches WHERE id = ?', [matchId], (errM, matchRow) => {
      if (errM) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!matchRow) { db.close(); return res.status(404).json({ error: 'Match not found' }); }

      db.all('SELECT user_id, points, team FROM votes WHERE match_id = ?', [matchId], (err, votes) => {
        if (err) { db.close(); return res.status(500).json({ error: 'DB error: ' + err.message }); }

        if (!votes || votes.length === 0) {
          db.close();
          return res.json({ ok: true, message: 'No votes to clear', refunded: 0 });
        }

        const finishDelete = () => {
          db.run('DELETE FROM votes WHERE match_id = ?', [matchId], function(err3) {
            db.close();
            if (err3) return res.status(500).json({ error: 'Failed to delete votes: ' + err3.message });
            res.json({ ok: true, message: 'Votes cleared', refunded: 0, votesCleared: votes.length });
          });
        };

        // If winner already set, reverse season balance changes first
        if (matchRow.winner) {
          const winner = matchRow.winner;
          const seasonId = matchRow.season_id;
          const winnerVotes = votes.filter(v => v.team === winner);
          const loserVotes = votes.filter(v => v.team !== winner);
          const totalWinner = winnerVotes.reduce((s, v) => s + v.points, 0);
          const totalLoser = loserVotes.reduce((s, v) => s + v.points, 0);

          let done = 0;
          const total = winnerVotes.length + loserVotes.length;
          if (total === 0) { finishDelete(); return; }

          // Reverse winner gains
          winnerVotes.forEach(v => {
            const gain = Math.round((v.points / totalWinner) * totalLoser);
            db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
              [gain, v.user_id, seasonId], () => { done++; if (done === total) finishDelete(); });
          });
          // Restore loser deductions
          loserVotes.forEach(v => {
            db.run('UPDATE user_seasons SET balance = balance + ? WHERE user_id = ? AND season_id = ?',
              [v.points, v.user_id, seasonId], () => { done++; if (done === total) finishDelete(); });
          });
        } else {
          // No winner yet — votes haven't affected balances, just delete them
          finishDelete();
        }
      });
    });
  });
});

// Admin: Clear winner for a match (revert winner selection and season balance changes)
app.post('/api/admin/matches/:id/clear-winner', requireRole(['admin', 'superuser']), (req, res) => {
  const matchId = Number(req.params.id);
  if (!matchId) return res.status(400).json({ error: 'matchId required' });

  const db = openDb();
  db.serialize(() => {
    db.get('SELECT id, winner, season_id FROM matches WHERE id = ?', [matchId], (err1, match) => {
      if (err1) { db.close(); return res.status(500).json({ error: 'DB error' }); }
      if (!match) { db.close(); return res.status(404).json({ error: 'Match not found' }); }
      if (!match.winner) { db.close(); return res.json({ ok: true, message: 'No winner set for this match' }); }

      const winner = match.winner;
      const seasonId = match.season_id;

      db.all('SELECT user_id, team, points FROM votes WHERE match_id = ?', [matchId], (err2, votes) => {
        if (err2) { db.close(); return res.status(500).json({ error: 'Failed to fetch votes' }); }

        if (!votes || votes.length === 0) {
          db.run('UPDATE matches SET winner = NULL WHERE id = ?', [matchId], function(err3) {
            db.close();
            if (err3) return res.status(500).json({ error: 'Failed to clear winner' });
            res.json({ ok: true, message: 'Winner cleared (no votes to revert)' });
          });
          return;
        }

        const winnerVotes = votes.filter(v => v.team === winner);
        const loserVotes = votes.filter(v => v.team !== winner);
        const totalWinner = winnerVotes.reduce((sum, v) => sum + v.points, 0);
        const totalLoser = loserVotes.reduce((sum, v) => sum + v.points, 0);

        let processed = 0;
        const totalToProcess = winnerVotes.length + loserVotes.length;

        const finishClearWinner = () => {
          db.run('UPDATE matches SET winner = NULL WHERE id = ?', [matchId], function(err5) {
            db.close();
            if (err5) return res.status(500).json({ error: 'Failed to clear winner' });
            res.json({ ok: true, message: 'Winner cleared and season balances reverted', winnersReverted: winnerVotes.length, totalReverted: totalLoser });
          });
        };

        if (totalToProcess === 0) { finishClearWinner(); return; }

        // Reverse winner gains (subtract gain from their season balance)
        winnerVotes.forEach(v => {
          const gain = totalWinner > 0 ? Math.round((v.points / totalWinner) * totalLoser) : 0;
          db.run('UPDATE user_seasons SET balance = balance - ? WHERE user_id = ? AND season_id = ?',
            [gain, v.user_id, seasonId], () => {
              processed++;
              if (processed === totalToProcess) finishClearWinner();
            });
        });

        // Restore loser season balances (add back the points they lost)
        loserVotes.forEach(v => {
          db.run('UPDATE user_seasons SET balance = balance + ? WHERE user_id = ? AND season_id = ?',
            [v.points, v.user_id, seasonId], () => {
              processed++;
              if (processed === totalToProcess) finishClearWinner();
            });
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

// Check user's authentication method (Google OAuth vs password)
app.get('/api/users/:id/auth-method', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const id = Number(req.params.id);

  // Allow users to check their own auth method, or admins to check anyone
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = openDb();
  db.get('SELECT google_id, password FROM users WHERE id = ?', [id], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'User not found' });

    const hasGoogleId = !!row.google_id;
    const hasPassword = !!row.password;

    res.json({
      hasGoogleId,
      hasPassword,
      authMethod: hasGoogleId && !hasPassword ? 'google' : hasGoogleId && hasPassword ? 'both' : 'password',
      canChangePassword: !hasGoogleId || hasPassword // Can change if not Google-only
    });
  });
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
    db.get('SELECT password, google_id FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!row) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent Google-only users from setting passwords
      if (row.google_id && !row.password) {
        db.close();
        return res.status(400).json({
          error: 'Cannot set password for Google OAuth users. Please continue using Google to sign in.'
        });
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

// Admin: Get user's assigned seasons (with per-season balance)
app.get('/api/admin/users/:id/seasons', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.id);
  const db = openDb();
  db.all('SELECT season_id, balance FROM user_seasons WHERE user_id = ?', [userId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json((rows || []).map(r => r.season_id));
  });
});

// Admin: Update user's assigned seasons (preserve existing season balances)
app.put('/api/admin/users/:id/seasons', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.id);
  const { season_ids } = req.body;

  if (!Array.isArray(season_ids)) {
    return res.status(400).json({ error: 'season_ids array required' });
  }

  const seasonIds = season_ids.map(Number).filter(Boolean);

  const db = openDb();
  db.serialize(() => {
    // Get user's current balance and existing season assignments
    db.get('SELECT balance FROM users WHERE id = ?', [userId], (errUser, userRow) => {
      const defaultBalance = (userRow && userRow.balance) ? userRow.balance : 1000;

      // Get previously assigned seasons with their balances
      db.all('SELECT season_id, balance FROM user_seasons WHERE user_id = ?', [userId], (errOld, oldSeasons) => {
        if (errOld) { db.close(); return res.status(500).json({ error: 'DB error' }); }

        const oldSeasonMap = {};
        (oldSeasons || []).forEach(s => { oldSeasonMap[s.season_id] = s.balance; });
        const oldSeasonIds = Object.keys(oldSeasonMap).map(Number);
        // Find newly added seasons (in seasonIds but not in oldSeasonIds)
        const newSeasonIds = seasonIds.filter(sid => !oldSeasonIds.includes(sid));

        // Delete all existing assignments
        db.run('DELETE FROM user_seasons WHERE user_id = ?', [userId], (err1) => {
          if (err1) { db.close(); return res.status(500).json({ error: 'DB error' }); }

          if (seasonIds.length === 0) {
            db.close();
            return res.json({ ok: true, message: 'Seasons updated' });
          }

          // Re-insert season assignments, preserving existing balances for old seasons
          let pending = seasonIds.length;
          seasonIds.forEach(seasonId => {
            const existingBalance = oldSeasonMap[seasonId] !== undefined ? oldSeasonMap[seasonId] : defaultBalance;
            db.run('INSERT INTO user_seasons (user_id, season_id, balance) VALUES (?, ?, ?)',
              [userId, seasonId, existingBalance], (err2) => {
                if (err2) console.error('Error inserting season assignment:', err2);
                pending--;
                if (pending === 0) {
                  db.close();
                  // If there are new seasons, process auto-loss for them
                  if (newSeasonIds.length > 0) {
                    processAutoLossForNewSeasons(userId, newSeasonIds, (autoLossErr) => {
                      if (autoLossErr) console.error('Error processing auto-loss for newly assigned seasons:', autoLossErr);
                      res.json({ ok: true, message: 'Seasons updated' });
                    });
                  } else {
                    res.json({ ok: true, message: 'Seasons updated' });
                  }
                }
              });
          });
        });
      });
    });
  });
});

// Admin: Update a user's season-specific balance
app.put('/api/admin/users/:userId/seasons/:seasonId/balance', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const seasonId = Number(req.params.seasonId);
  const { balance } = req.body;
  if (balance === undefined || balance === null) return res.status(400).json({ error: 'balance required' });
  const db = openDb();
  db.run('UPDATE user_seasons SET balance = ? WHERE user_id = ? AND season_id = ?',
    [balance, userId, seasonId], function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error: ' + err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Season assignment not found' });
      res.json({ ok: true, message: 'Season balance updated' });
    });
});

// Admin: Get all season balances for a user
app.get('/api/admin/users/:userId/season-balances', requireRole('admin'), (req, res) => {
  const userId = Number(req.params.userId);
  const db = openDb();
  db.all('SELECT us.season_id, us.balance, s.name as season_name FROM user_seasons us JOIN seasons s ON s.id = us.season_id WHERE us.user_id = ?',
    [userId], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows || []);
    });
});

// ========== Retroactive Auto-Loss Balance Fix ==========

// POST /api/admin/fix-auto-loss-balances
// Finds every vote that was created after the match started (i.e. auto-loss votes) and
// was double-charged. Credits each affected user +10 per such vote, marks the vote so
// the endpoint is idempotent (safe to call multiple times).
app.post('/api/admin/fix-auto-loss-balances', requireRole('admin'), (req, res) => {
  const db = openDb();

  // Fetch all completed matches with a winner set
  db.all('SELECT id, season_id, scheduled_at, winner FROM matches WHERE winner IS NOT NULL', [], (err, matches) => {
    if (err) return res.status(500).json({ error: 'DB error fetching matches', details: err.message });
    if (!matches || matches.length === 0) return res.json({ fixed: 0, details: [] });

    const results = [];
    let pending = matches.length;

    function finish() {
      pending--;
      if (pending === 0) {
        const totalFixed = results.reduce((s, r) => s + r.credited, 0);
        res.json({ fixed: totalFixed, details: results });
      }
    }

    matches.forEach(match => {
      // Parse scheduled_at using our existing helper so we can compare timestamps
      const matchDate = parseMatchDateTime(match.scheduled_at);
      if (!matchDate) { finish(); return; }

      // The voting window closes 30 min before the match.
      // Auto-loss votes are inserted AFTER the match starts, so their
      // created_at will be well after matchDate. We use a 25-min buffer
      // to safely distinguish real late votes from auto-loss inserts.
      const cutoff = new Date(matchDate.getTime() - 25 * 60 * 1000); // matchDate - 25min

      // Find votes for this match that:
      //   1. are on the losing team (team != winner)
      //   2. were created at or after the cutoff (auto-loss timing)
      //   3. have NOT yet been fixed (is_auto_loss = 0, meaning they predate our column)
      const sql = `
        SELECT v.id, v.user_id, v.points, v.created_at, v.is_auto_loss
        FROM votes v
        WHERE v.match_id = ?
          AND v.team != ?
          AND v.is_auto_loss = 0
          AND datetime(v.created_at) >= datetime(?)
      `;
      const cutoffStr = cutoff.toISOString();

      db.all(sql, [match.id, match.winner, cutoffStr], (err2, suspectVotes) => {
        if (err2 || !suspectVotes || suspectVotes.length === 0) { finish(); return; }

        let votePending = suspectVotes.length;
        let credited = 0;

        suspectVotes.forEach(vote => {
          // Credit +10 (the amount that was double-deducted) to user's season balance
          db.run(
            'UPDATE user_seasons SET balance = balance + 10 WHERE user_id = ? AND season_id = ?',
            [vote.user_id, match.season_id],
            (errUpd) => {
              if (!errUpd) {
                credited++;
                // Mark the vote so we never double-credit
                db.run('UPDATE votes SET is_auto_loss = 1 WHERE id = ?', [vote.id]);
              }
              votePending--;
              if (votePending === 0) {
                results.push({ match_id: match.id, scheduled_at: match.scheduled_at, credited });
                finish();
              }
            }
          );
        });
      });
    });
  });
});

// ========== Email Settings Management ==========

// Get email settings
app.get('/api/admin/email-settings', requireRole('admin'), (req, res) => {
  const db = openDb();

  // Ensure settings table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `, (createErr) => {
    if (createErr) {
      db.close();
      return res.status(500).json({ error: 'DB error: ' + createErr.message });
    }

    db.get("SELECT value FROM settings WHERE key = 'email_config'", (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error: ' + err.message });

      let config = null;
      if (row) {
        try {
          config = JSON.parse(row.value);
          // Don't send password back to frontend for security
          if (config.password) config.password = '***';
        } catch (e) {
          config = null;
        }
      }
      res.json({ ok: true, config: config });
    });
  });
});

// Save email settings
app.post('/api/admin/email-settings', requireRole('admin'), (req, res) => {
  const { user, password, from } = req.body;

  if (!user || !password) {
    return res.status(400).json({ error: 'Email user and password are required' });
  }

  const config = {
    user: user,
    password: password,
    from: from || user
  };

  const db = openDb();

  // Ensure settings table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `, (createErr) => {
    if (createErr) {
      db.close();
      return res.status(500).json({ error: 'DB error: ' + createErr.message });
    }

    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('email_config', ?)",
      [JSON.stringify(config)],
      function(err) {
        if (err) {
          db.close();
          return res.status(500).json({ error: 'DB error: ' + err.message });
        }

        // Test the email configuration
        emailService.testEmailConfig(config, (testErr) => {
          db.close();
          if (testErr) {
            return res.status(500).json({ ok: false, message: 'Email configuration saved but test failed: ' + testErr.message });
          }
          res.json({ ok: true, message: 'Email settings saved and tested successfully' });
        });
      }
    );
  });
});

// Diagnostic endpoint to check admin emails
app.get('/api/admin/check-emails', (req, res) => {
  const db = openDb();
  db.all("SELECT id, username, role, email FROM users WHERE role = 'admin'", (err, rows) => {
    db.close();
    if (err) {
      return res.status(500).json({ error: 'DB error: ' + err.message });
    }
    res.json({
      adminUsers: rows,
      totalAdmins: rows ? rows.length : 0,
      adminEmailsWithValidValues: rows ? rows.filter(r => r.email && r.email !== 'xyz@xyz.com').length : 0
    });
  });
});

// Ensure database migrations are complete before starting server
function waitForMigrations(callback) {
  const db = new sqlite3.Database(DB_PATH);
  let migrationsNeeded = 0;
  let migrationsDone = 0;

  const checkComplete = () => {
    migrationsDone++;
    if (migrationsDone >= 2) {
      db.close();
      callback();
    }
  };

  // Check and add google_id column
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Migration check error:', err);
      checkComplete();
      return;
    }

    const hasGoogleId = columns && columns.some(c => c.name === 'google_id');
    if (!hasGoogleId) {
      console.log('Adding google_id column...');
      db.run('ALTER TABLE users ADD COLUMN google_id TEXT', (err) => {
        if (err && !err.message.includes('duplicate')) {
          console.error('Error adding google_id:', err.message);
        } else {
          console.log('✅ google_id column ready');
        }
        checkComplete();
      });
    } else {
      console.log('✅ google_id column already exists');
      checkComplete();
    }
  });

  // Check and add email column
  db.all(`PRAGMA table_info(users)`, (err, columns) => {
    if (err) {
      console.error('Migration check error:', err);
      checkComplete();
      return;
    }

    const hasEmail = columns && columns.some(c => c.name === 'email');
    if (!hasEmail) {
      console.log('Adding email column...');
      db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT 'xyz@xyz.com'`, (err) => {
        if (err && !err.message.includes('duplicate')) {
          console.error('Error adding email:', err.message);
        } else {
          console.log('✅ email column ready');
        }
        checkComplete();
      });
    } else {
      console.log('✅ email column already exists');
      checkComplete();
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PREDICTIONS API
// ──────────────────────────────────────────────────────────────────────────────

// Small in-memory cache to reduce CricAPI calls for repeated UI refreshes
const predictionPlayersCache = new Map();

function getCachedPredictionPlayers(key) {
  const hit = predictionPlayersCache.get(key);
  if (!hit) return null;
  // 2 hour cache (squad data rarely changes during season)
  if (Date.now() - hit.ts > 2 * 60 * 60 * 1000) {
    predictionPlayersCache.delete(key);
    return null;
  }
  return hit.data;
}

function setCachedPredictionPlayers(key, data) {
  predictionPlayersCache.set(key, { ts: Date.now(), data });
}

function fetchJson(url, cb) {
  const https = require('https');
  https.get(url, (apiRes) => {
    let raw = '';
    apiRes.on('data', chunk => { raw += chunk; });
    apiRes.on('end', () => {
      try {
        cb(null, JSON.parse(raw));
      } catch (e) {
        cb(new Error('Invalid JSON response'));
      }
    });
  }).on('error', (err) => cb(err));
}

function normalizeTeamName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractPlayersFromMatch(matchObj) {
  const players = [];

  // Some CricAPI responses include teamInfo[].players (array of objects or strings)
  if (Array.isArray(matchObj.teamInfo)) {
    matchObj.teamInfo.forEach(team => {
      if (Array.isArray(team.players)) {
        team.players.forEach(p => {
          if (typeof p === 'string') players.push(p);
          else if (p && p.name) players.push(p.name);
        });
      }
    });
  }

  // Fallback shape seen in some responses
  if (Array.isArray(matchObj.players)) {
    matchObj.players.forEach(p => {
      if (typeof p === 'string') players.push(p);
      else if (p && p.name) players.push(p.name);
    });
  }

  return [...new Set(players.filter(Boolean).map(x => String(x).trim()))];
}

// GET /api/predictions/players - Fetch likely player list for a match using CricAPI
app.get('/api/predictions/players', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const homeTeam = String(req.query.home_team || '').trim();
  const awayTeam = String(req.query.away_team || '').trim();

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'home_team and away_team required' });
  }

  const cacheKey = `${normalizeTeamName(homeTeam)}__${normalizeTeamName(awayTeam)}`;
  const cached = getCachedPredictionPlayers(cacheKey);
  if (cached) return res.json(cached);

  const homeKey = normalizeTeamName(homeTeam);
  const awayKey = normalizeTeamName(awayTeam);

  // Try matches feed first (usually has the freshest squads)
  const url = `https://api.cricapi.com/v1/matches?apikey=${CRICAPI_KEY}&offset=0`;
  fetchJson(url, (err, parsed) => {
    if (err || !parsed) {
      return res.json({ players: [], source: 'unavailable' });
    }

    const matches = Array.isArray(parsed.data) ? parsed.data : [];
    let candidate = null;

    for (const m of matches) {
      const teams = Array.isArray(m.teams) ? m.teams : [];
      const keys = teams.map(normalizeTeamName);
      if (keys.includes(homeKey) && keys.includes(awayKey)) {
        candidate = m;
        break;
      }
    }

    let players = candidate ? extractPlayersFromMatch(candidate) : [];

    // Fallback: if squads are missing, query players search for each team name
    const finish = (finalPlayers, source) => {
      const data = { players: finalPlayers, source };
      setCachedPredictionPlayers(cacheKey, data);
      res.json(data);
    };

    if (players.length > 0) {
      return finish(players, 'matches');
    }

    const teamSearch = (teamName, cb) => {
      const searchUrl = `https://api.cricapi.com/v1/players?apikey=${CRICAPI_KEY}&offset=0&search=${encodeURIComponent(teamName)}`;
      fetchJson(searchUrl, (e2, p2) => {
        if (e2 || !p2 || !Array.isArray(p2.data)) return cb([]);
        const names = p2.data
          .map(x => x && x.name ? String(x.name).trim() : '')
          .filter(Boolean)
          .slice(0, 30);
        cb(names);
      });
    };

    teamSearch(homeTeam, (homePlayers) => {
      teamSearch(awayTeam, (awayPlayers) => {
        players = [...new Set([...(homePlayers || []), ...(awayPlayers || [])])];
        return finish(players, 'players-search');
      });
    });
  });
});

// DELETE /api/predictions/players-by-season/:seasonId/cache - Clear squad cache for a season
app.delete('/api/predictions/players-by-season/:seasonId/cache', requireRole('admin'), (req, res) => {
  const seasonId = Number(req.params.seasonId);
  
  // Clear both Cricbuzz and CricAPI cache keys
  const cricbuzzKey = `cricbuzz_squad_${seasonId}`;
  const cricapiKey = `season_squad_${seasonId}`;
  
  predictionPlayersCache.delete(cricbuzzKey);
  predictionPlayersCache.delete(cricapiKey);
  
  console.log(`✅ Cleared squad cache for season ${seasonId}`);
  res.json({ 
    success: true, 
    message: 'Squad cache cleared. Next request will fetch fresh data from API.',
    clearedKeys: [cricbuzzKey, cricapiKey]
  });
});

// GET /api/predictions/players-by-season/:seasonId - Fetch player squad for a season using CricAPI series_squad
// Optional query params: team1, team2 - to filter players by specific teams
app.get('/api/predictions/players-by-season/:seasonId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const seasonId = Number(req.params.seasonId);
  const team1 = req.query.team1 ? String(req.query.team1).trim() : null;
  const team2 = req.query.team2 ? String(req.query.team2).trim() : null;

  const db = openDb();

  db.get('SELECT cricapi_series_id, cricbuzz_series_id FROM seasons WHERE id = ?', [seasonId], (err, season) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }
    if (!season) {
      db.close();
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Prefer Cricbuzz squad data if available
    if (season.cricbuzz_series_id) {
      const cacheKey = `cricbuzz_squad_${seasonId}`;
      const cached = getCachedPredictionPlayers(cacheKey);

      // Return cached data if available (memory cache - fastest)
      if (cached) {
        db.close();
        if (team1 && team2) {
          const filtered = filterPlayersByTeams(cached, team1, team2);
          return res.json(filtered);
        }
        return res.json(cached);
      }

      // Check database next (persistent cache)
      db.all('SELECT * FROM season_players WHERE season_id = ? ORDER BY team_name, player_name', [seasonId], (dbErr, players) => {
        db.close();
        
        if (dbErr) {
          console.error('Error loading squad from database:', dbErr);
          return res.status(500).json({ error: 'Database error loading squad' });
        }
        
        // If we have squad data in database, use it
        if (players && players.length > 0) {
          console.log(`✅ Loaded ${players.length} players from database for season ${seasonId}`);
          
          // Build teamSquads structure from DB
          const teamSquadMap = {};
          const allPlayers = [];
          
          players.forEach(p => {
            const playerObj = {
              id: p.player_id,
              name: p.player_name,
              role: p.role || '',
              imageId: p.image_id || null,
              imageUrl: p.image_id ? `/api/player-image/c${p.image_id}` : null,
              battingStyle: p.batting_style || '',
              bowlingStyle: p.bowling_style || '',
              captain: p.is_captain === 1
            };
            
            if (!teamSquadMap[p.team_name]) {
              teamSquadMap[p.team_name] = [];
            }
            teamSquadMap[p.team_name].push(playerObj);
            allPlayers.push(playerObj);
          });
          
          const fullData = {
            players: allPlayers,
            source: 'database',
            season_id: seasonId,
            teamSquads: teamSquadMap
          };
          
          // Cache in memory for even faster subsequent requests
          setCachedPredictionPlayers(cacheKey, fullData);
          
          // Filter by teams if provided
          if (team1 && team2) {
            const filtered = filterPlayersByTeams(fullData, team1, team2);
            return res.json(filtered);
          }
          
          return res.json(fullData);
        }
        
        // No data in database - fall back to Cricbuzz API (admin should refresh squad first)
        console.log(`⚠️  No squad data in database for season ${seasonId}, returning empty (admin should refresh squad)`);
        return res.json({
          players: [],
          teamSquads: {},
          source: 'no_data',
          message: 'Squad data not available. Admin should click "Refresh Squad" to fetch from Cricbuzz.'
        });
      });
      return; // Exit early for Cricbuzz path
    }
    
    // Fallback to CricAPI if season has cricapi_series_id
    if (!season.cricapi_series_id) {
      // Manually created season
      return res.json({ 
        players: [], 
        source: 'no_series_id', 
        message: 'No squad data available for this season. Import from Cricbuzz or CricAPI to get player squads, or use the "Other" option for predictions.' 
      });
    }

    const cacheKey = `season_squad_${seasonId}`;
    const cached = getCachedPredictionPlayers(cacheKey);

    // If we have cached data, filter by teams if provided
    if (cached) {
      if (team1 && team2) {
        const filtered = filterPlayersByTeams(cached, team1, team2);
        return res.json(filtered);
      }
      return res.json(cached);
    }

    const url = `https://api.cricapi.com/v1/series_squad?apikey=${CRICAPI_KEY}&id=${encodeURIComponent(season.cricapi_series_id)}`;
    fetchJson(url, (fetchErr, parsed) => {
      if (fetchErr || !parsed) {
        return res.json({ players: [], source: 'api_error', message: 'Failed to fetch squad from CricAPI' });
      }

      const squads = Array.isArray(parsed.data) ? parsed.data : [];

      // Store full squad data with team information and player details
      const teamSquadMap = {};
      squads.forEach(teamSquad => {
        const teamName = teamSquad.teamName || teamSquad.name || '';
        if (teamName && Array.isArray(teamSquad.players)) {
          const players = [];
          teamSquad.players.forEach(player => {
            if (player && typeof player === 'object' && player.name) {
              // Store full player object with image, role, etc.
              players.push({
                id: player.id || null,
                name: String(player.name).trim(),
                role: player.role || '',
                playerImg: player.playerImg || '',
                battingStyle: player.battingStyle || '',
                bowlingStyle: player.bowlingStyle || '',
                country: player.country || ''
              });
            }
          });
          teamSquadMap[teamName] = players;
        }
      });

      // Create full player list
      const allPlayers = [];
      Object.values(teamSquadMap).forEach(players => {
        allPlayers.push(...players);
      });

      const fullData = {
        players: allPlayers,
        source: 'series_squad',
        season_id: seasonId,
        teamSquads: teamSquadMap
      };

      setCachedPredictionPlayers(cacheKey, fullData);

      // Filter by teams if provided
      if (team1 && team2) {
        const filtered = filterPlayersByTeams(fullData, team1, team2);
        return res.json(filtered);
      }

      res.json(fullData);
    });
  });
});

// POST /api/admin/seasons/:id/refresh-squad - force refresh latest season squad from Cricbuzz or CricAPI
app.post('/api/admin/seasons/:id/refresh-squad', requireRole('admin'), (req, res) => {
  const seasonId = Number(req.params.id);
  if (!Number.isFinite(seasonId)) {
    return res.status(400).json({ error: 'Invalid season id' });
  }

  const db = openDb();
  db.get('SELECT id, name, cricapi_series_id, cricbuzz_series_id FROM seasons WHERE id = ?', [seasonId], (err, season) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!season) return res.status(404).json({ error: 'Season not found' });
    
    // Prefer Cricbuzz if available
    if (season.cricbuzz_series_id) {
      const cacheKey = `cricbuzz_squad_${seasonId}`;
      predictionPlayersCache.delete(cacheKey);

      // First get squad IDs
      fetchCricbuzz(`/series/v1/${season.cricbuzz_series_id}/squads`, (cbErr, cbData) => {
        if (cbErr || !cbData || !cbData.squads) {
          return res.status(502).json({ error: 'Failed to fetch squads from Cricbuzz' });
        }

        const teamSquads = cbData.squads.filter(s => s.squadId && !s.isHeader);
        if (teamSquads.length === 0) {
          return res.status(404).json({ error: 'No squads available for this series on Cricbuzz' });
        }

        // Fetch player details for each team
        let completed = 0;
        const teamSquadMap = {};
        const allPlayers = [];

        teamSquads.forEach(squad => {
          fetchCricbuzz(`/series/v1/${season.cricbuzz_series_id}/squads/${squad.squadId}`, (err2, playerData) => {
            completed++;
            
            if (!err2 && playerData && Array.isArray(playerData.player)) {
              const teamName = squad.squadType || `Team ${squad.teamId}`;
              const players = [];
              
              playerData.player.forEach(p => {
                if (p.isHeader || !p.id) return;
                players.push({
                  id: p.id,
                  name: p.name,
                  role: p.role || '',
                  imageId: p.imageId || null,
                  imageUrl: p.imageId ? `/api/player-image/c${p.imageId}` : null,
                  battingStyle: p.battingStyle || '',
                  bowlingStyle: p.bowlingStyle || '',
                  captain: p.captain || false
                });
                allPlayers.push(players[players.length - 1]);
              });
              
              teamSquadMap[teamName] = players;
            }

            if (completed === teamSquads.length) {
              // Save squad data to database for persistent caching
              const dbSave = openDb();
              
              // First clear existing squad data for this season
              dbSave.run('DELETE FROM season_players WHERE season_id = ?', [seasonId], (delErr) => {
                if (delErr) {
                  console.error('Error clearing old squad data:', delErr);
                  dbSave.close();
                  return res.status(500).json({ error: 'Failed to save squad data' });
                }
                
                // Insert all players
                const stmt = dbSave.prepare(
                  'INSERT INTO season_players (season_id, team_name, player_id, player_name, role, image_id, batting_style, bowling_style, is_captain, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                
                Object.entries(teamSquadMap).forEach(([teamName, players]) => {
                  players.forEach(p => {
                    stmt.run(
                      seasonId,
                      teamName,
                      p.id,
                      p.name,
                      p.role || '',
                      p.imageId || null,
                      p.battingStyle || '',
                      p.bowlingStyle || '',
                      p.captain ? 1 : 0,
                      new Date().toISOString()
                    );
                  });
                });
                
                stmt.finalize((finalErr) => {
                  dbSave.close();
                  if (finalErr) {
                    console.error('Error saving squad data:', finalErr);
                    return res.status(500).json({ error: 'Failed to save squad data' });
                  }
                  
                  console.log(`✅ Saved ${allPlayers.length} players to database for season ${seasonId}`);
                  
                  const fullData = {
                    players: allPlayers,
                    source: 'cricbuzz',
                    season_id: seasonId,
                    teamSquads: teamSquadMap
                  };

                  setCachedPredictionPlayers(cacheKey, fullData);

                  res.json({
                    ok: true,
                    season_id: seasonId,
                    season_name: season.name,
                    teams: Object.keys(teamSquadMap).length,
                    players: allPlayers.length,
                    source: 'cricbuzz',
                    saved_to_db: true,
                    refreshed_at: new Date().toISOString()
                  });
                });
              });
            }
          });
        });
      });
      return; // Exit early for Cricbuzz
    }
    
    // Fallback to CricAPI
    if (!season.cricapi_series_id) {
      return res.status(400).json({ error: 'This season has no Cricbuzz or CricAPI series mapping. Re-import from Cricbuzz or CricAPI first.' });
    }

    const cacheKey = `season_squad_${seasonId}`;
    predictionPlayersCache.delete(cacheKey);

    const url = `https://api.cricapi.com/v1/series_squad?apikey=${CRICAPI_KEY}&id=${encodeURIComponent(season.cricapi_series_id)}`;
    fetchJson(url, (fetchErr, parsed) => {
      if (fetchErr || !parsed) {
        return res.status(502).json({ error: 'Failed to fetch squad from CricAPI' });
      }

      const squads = Array.isArray(parsed.data) ? parsed.data : [];
      const teamSquadMap = {};
      squads.forEach(teamSquad => {
        const teamName = teamSquad.teamName || teamSquad.name || '';
        if (!teamName || !Array.isArray(teamSquad.players)) return;

        const players = [];
        teamSquad.players.forEach(player => {
          if (player && typeof player === 'object' && player.name) {
            players.push({
              id: player.id || null,
              name: String(player.name).trim(),
              role: player.role || '',
              playerImg: player.playerImg || '',
              battingStyle: player.battingStyle || '',
              bowlingStyle: player.bowlingStyle || '',
              country: player.country || ''
            });
          }
        });
        teamSquadMap[teamName] = players;
      });

      const allPlayers = [];
      Object.values(teamSquadMap).forEach(players => allPlayers.push(...players));

      const fullData = {
        players: allPlayers,
        source: 'cricapi',
        season_id: seasonId,
        teamSquads: teamSquadMap
      };

      setCachedPredictionPlayers(cacheKey, fullData);

      res.json({
        ok: true,
        season_id: seasonId,
        season_name: season.name,
        teams: Object.keys(teamSquadMap).length,
        players: allPlayers.length,
        source: 'cricapi',
        refreshed_at: new Date().toISOString()
      });
    });
  });
});

// Helper function to filter players by team names
function filterPlayersByTeams(squadData, team1, team2) {
  if (!squadData.teamSquads) {
    // Fallback if teamSquads not available
    return { ...squadData, players: squadData.players || [] };
  }

  const normalize = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const team1Norm = normalize(team1);
  const team2Norm = normalize(team2);

  const filteredTeamSquads = {};
  const matchedPlayers = [];

  console.log(`[filterPlayersByTeams] Looking for: "${team1}" (${team1Norm}) and "${team2}" (${team2Norm})`);
  console.log(`[filterPlayersByTeams] Available teams:`, Object.keys(squadData.teamSquads));

  // Find matching teams by normalized name and keep them separate
  Object.entries(squadData.teamSquads).forEach(([teamName, players]) => {
    const teamNorm = normalize(teamName);
    const matchesTeam1 = teamNorm.includes(team1Norm) || team1Norm.includes(teamNorm);
    const matchesTeam2 = teamNorm.includes(team2Norm) || team2Norm.includes(teamNorm);
    
    console.log(`  - "${teamName}" (${teamNorm}): matches T1=${matchesTeam1}, T2=${matchesTeam2}`);
    
    if (matchesTeam1 || matchesTeam2) {
      filteredTeamSquads[teamName] = players;
      matchedPlayers.push(...players);
      console.log(`    ✓ Matched! Added ${players.length} players`);
    }
  });

  const uniqueFiltered = [...new Set(matchedPlayers)];

  console.log(`[filterPlayersByTeams] Result: ${Object.keys(filteredTeamSquads).length} teams, ${uniqueFiltered.length} total players`);

  // If no teams matched, return empty squads instead of all squads
  // This prevents frontend from showing wrong players for teams not yet available
  if (Object.keys(filteredTeamSquads).length === 0) {
    console.log(`  ⚠️  No teams found! Returning empty squads.`);
    return {
      ...squadData,
      players: [],
      teamSquads: {},
      filtered: false,
      matchedTeams: 0,
      error: `Squad data not yet available for ${team1} and ${team2}`,
      availableTeams: Object.keys(squadData.teamSquads)
    };
  }

  return {
    ...squadData,
    players: uniqueFiltered,
    teamSquads: filteredTeamSquads,
    filtered: true,
    matchedTeams: Object.keys(filteredTeamSquads).length
  };
}

// GET /api/predictions/upcoming - upcoming matches available for prediction
app.get('/api/predictions/upcoming', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const db = openDb();

  const finish = (rows) => {
    const now = new Date();
    // Show matches that haven't started yet OR started within the last 30 minutes (still votable window)
    // Use a 30-min buffer so matches don't disappear right at kickoff
    const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Only show matches within the next 2 days to improve performance
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    // First, try to get matches within next 2 days
    let data = (rows || [])
      .map((m) => ({ ...m, _dt: parseMatchDateTime(m.scheduled_at) }))
      .filter((m) => !m.winner)
      .filter((m) => m._dt && !Number.isNaN(m._dt.getTime()) && m._dt >= cutoff && m._dt <= twoDaysFromNow)
      .sort((a, b) => a._dt - b._dt)
      .map(({ _dt, ...rest }) => rest);
    
    // If no matches in next 2 days, show next 2 upcoming matches regardless of date
    if (data.length === 0) {
      data = (rows || [])
        .map((m) => ({ ...m, _dt: parseMatchDateTime(m.scheduled_at) }))
        .filter((m) => !m.winner)
        .filter((m) => m._dt && !Number.isNaN(m._dt.getTime()) && m._dt >= cutoff)
        .sort((a, b) => a._dt - b._dt)
        .slice(0, 2)
        .map(({ _dt, ...rest }) => rest);
    }

    db.close();
    res.json(data);
  };

  // Only admin sees all seasons (no user_seasons filter needed)
  if (req.user.role === 'admin') {
    const params = [];
    let query = `
      SELECT m.id, m.season_id, m.home_team, m.away_team, m.scheduled_at, m.venue, m.winner, s.name as season_name
      FROM matches m
      JOIN seasons s ON s.id = m.season_id
    `;
    if (seasonId) {
      query += ' WHERE m.season_id = ?';
      params.push(seasonId);
    }
    db.all(query, params, (err, rows) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      finish(rows);
    });
    return;
  }

  // Regular pickers and superusers: only see matches for seasons they are assigned to
  const params = [req.user.id];
  let query = `
    SELECT m.id, m.season_id, m.home_team, m.away_team, m.scheduled_at, m.venue, m.winner, s.name as season_name
    FROM matches m
    JOIN seasons s ON s.id = m.season_id
    JOIN user_seasons us ON us.season_id = m.season_id
    WHERE us.user_id = ?
  `;
  if (seasonId) {
    query += ' AND m.season_id = ?';
    params.push(seasonId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }
    finish(rows);
  });
});

// GET /api/predictions/user-history - Get user's prediction history
// ⚠️ MUST be defined BEFORE /api/predictions/:matchId to avoid Express matching "user-history" as a matchId
app.get('/api/predictions/user-history', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const username = req.headers['x-user'];
  const { season_id, userId } = req.query;
  const db = openDb();

  db.get('SELECT id, role FROM users WHERE LOWER(username) = ?', [username.toLowerCase()], (err, user) => {
    if (err || !user) {
      db.close();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = user.role === 'admin';
    let query;
    const params = [];

    if (isAdmin) {
      query = `
        SELECT p.*, m.home_team, m.away_team, m.scheduled_at, m.winner, m.season_id,
               s.name as season_name,
               u.username, u.display_name,
               pr.toss_winner as actual_toss, pr.man_of_match as actual_mom, pr.best_bowler as actual_bowler
        FROM predictions p
        JOIN matches m ON p.match_id = m.id
        JOIN seasons s ON m.season_id = s.id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN prediction_results pr ON p.match_id = pr.match_id
      `;

      const conditions = [];
      if (userId) {
        conditions.push('p.user_id = ?');
        params.push(Number(userId));
      }
      if (season_id) {
        conditions.push('m.season_id = ?');
        params.push(season_id);
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    } else {
      query = `
        SELECT p.*, m.home_team, m.away_team, m.scheduled_at, m.winner, m.season_id,
               s.name as season_name,
               pr.toss_winner as actual_toss, pr.man_of_match as actual_mom, pr.best_bowler as actual_bowler
        FROM predictions p
        JOIN matches m ON p.match_id = m.id
        JOIN seasons s ON m.season_id = s.id
        LEFT JOIN prediction_results pr ON p.match_id = pr.match_id
        WHERE p.user_id = ?
      `;

      params.push(user.id);

      if (season_id) {
        query += ' AND m.season_id = ?';
        params.push(season_id);
      }
    }

    query += ' ORDER BY m.scheduled_at DESC';

    db.all(query, params, (err, predictions) => {
      db.close();
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(predictions || []);
    });
  });
});

// GET /api/predictions/:matchId - Get user's prediction for a match
app.get('/api/predictions/:matchId', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const username = req.headers['x-user'];
  const { matchId } = req.params;
  const db = openDb();

  db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username.toLowerCase()], (err, user) => {
    if (err || !user) {
      db.close();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT * FROM predictions WHERE match_id = ? AND user_id = ?', [matchId, user.id], (err, prediction) => {
      db.close();
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(prediction || null);
    });
  });
});

// POST /api/predictions - Submit or update prediction
app.post('/api/predictions', requireRole('picker', 'superuser', 'admin'), (req, res) => {
  const username = req.headers['x-user'];
  const { match_id, toss_winner, man_of_match, best_bowler, toss_points, mom_points, bowler_points } = req.body;

  if (!match_id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  const db = openDb();

  db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username.toLowerCase()], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if match exists and prediction window is open (1 hour before match)
    db.get('SELECT scheduled_at, winner FROM matches WHERE id = ?', [match_id], (err, match) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      if (match.winner) {
        return res.status(400).json({ error: 'Match winner has been set. Voting is now closed.' });
      }

      // Check voting window (30 minutes cutoff - same as team voting)
      const matchTime = parseMatchDateTime(match.scheduled_at);
      if (!matchTime) { return res.status(400).json({ error: 'Invalid match schedule. Please contact admin.' }); }
      const cutoffTime = new Date(matchTime.getTime() - 30 * 60 * 1000);
      if (new Date() >= cutoffTime) { return res.status(400).json({ error: 'Prediction window closed (closes 30 minutes before match)' }); }

      // Upsert prediction with points
      db.run(`
        INSERT INTO predictions (match_id, user_id, toss_winner, man_of_match, best_bowler, toss_points, mom_points, bowler_points, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(match_id, user_id) DO UPDATE SET
          toss_winner = excluded.toss_winner,
          man_of_match = excluded.man_of_match,
          best_bowler = excluded.best_bowler,
          toss_points = excluded.toss_points,
          mom_points = excluded.mom_points,
          bowler_points = excluded.bowler_points,
          updated_at = CURRENT_TIMESTAMP
      `, [match_id, user.id, toss_winner, man_of_match, best_bowler, toss_points || 10, mom_points || 10, bowler_points || 10], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save prediction' });
        res.json({ ok: true, message: 'Prediction saved successfully' });
      });
    });
  });
});

// GET /api/predictions/results/:matchId - Get prediction results for a match (admin only)
app.get('/api/predictions/results/:matchId', requireRole('admin', 'superuser'), (req, res) => {
  const { matchId } = req.params;
  const db = openDb();

  db.get('SELECT * FROM prediction_results WHERE match_id = ?', [matchId], (err, result) => {
    db.close();
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(result || null);
  });
});

// GET /api/predictions/odds/:matchId - Get prediction odds for a match
app.get('/api/predictions/odds/:matchId', (req, res) => {
  const { matchId } = req.params;
  const db = openDb();

  // Get all predictions for this match with points
  db.all('SELECT toss_winner, man_of_match, best_bowler, toss_points, mom_points, bowler_points FROM predictions WHERE match_id = ?', [matchId], (err, predictions) => {
    db.close();
    if (err) return res.status(500).json({ error: 'Database error' });

    // Calculate odds for each category
    const tossOdds = {};
    const momOdds = {};
    const bowlerOdds = {};

    predictions.forEach(p => {
      if (p.toss_winner) {
        tossOdds[p.toss_winner] = (tossOdds[p.toss_winner] || 0) + (p.toss_points || 10);
      }
      if (p.man_of_match) {
        momOdds[p.man_of_match] = (momOdds[p.man_of_match] || 0) + (p.mom_points || 10);
      }
      if (p.best_bowler) {
        bowlerOdds[p.best_bowler] = (bowlerOdds[p.best_bowler] || 0) + (p.bowler_points || 10);
      }
    });

    res.json({
      toss: tossOdds,
      mom: momOdds,
      bowler: bowlerOdds,
      totalPredictions: predictions.length
    });
  });
});

// POST /api/predictions/results - Set prediction results (admin only)
app.post('/api/predictions/results', requireRole('admin', 'superuser'), (req, res) => {
  const { match_id, toss_winner, man_of_match, best_bowler } = req.body;

  if (!match_id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  const db = openDb();

  db.run(`
    INSERT INTO prediction_results (match_id, toss_winner, man_of_match, best_bowler)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET
      toss_winner = excluded.toss_winner,
      man_of_match = excluded.man_of_match,
      best_bowler = excluded.best_bowler
  `, [match_id, toss_winner, man_of_match, best_bowler], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'Failed to save results' });
    res.json({ ok: true, message: 'Prediction results saved successfully' });
  });
});


// Start the server
app.listen(port, () => {
  console.log(`✅ Cricket Mela backend running on port ${port}`);
  console.log(`📍 Database location: ${DB_PATH}`);
});

