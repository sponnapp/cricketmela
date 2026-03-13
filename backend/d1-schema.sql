-- Cloudflare D1 Database Schema for Cricket Mela
-- This file contains the complete schema migration from SQLite to D1

-- ═══════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  password TEXT,
  display_name TEXT,
  email TEXT DEFAULT 'xyz@xyz.com',
  google_id TEXT,
  approved INTEGER DEFAULT 1,
  balance REAL DEFAULT 100
);

-- Settings table (key-value store for app configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- User-to-season assignments (with per-season balance)
CREATE TABLE IF NOT EXISTS user_seasons (
  user_id INTEGER,
  season_id INTEGER,
  balance INTEGER DEFAULT 1000,
  UNIQUE(user_id, season_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  home_team TEXT,
  away_team TEXT,
  venue TEXT,
  scheduled_at TEXT,
  winner TEXT,
  FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- Votes table (team winner predictions)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  team TEXT NOT NULL,
  points REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Predictions table (toss, MOM, best bowler)
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  toss_winner TEXT,
  man_of_match TEXT,
  best_bowler TEXT,
  toss_points INTEGER DEFAULT 10,
  mom_points INTEGER DEFAULT 10,
  bowler_points INTEGER DEFAULT 10,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, user_id),
  FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Prediction results (actual match outcomes)
CREATE TABLE IF NOT EXISTS prediction_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL UNIQUE,
  toss_winner TEXT,
  man_of_match TEXT,
  best_bowler TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Products table (legacy, may not be needed)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  colors TEXT,
  sizes TEXT,
  image TEXT
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════

-- Users indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches(scheduled_at);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_match_id ON votes(match_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_match_user ON votes(match_id, user_id);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_user ON predictions(match_id, user_id);

-- User seasons indexes
CREATE INDEX IF NOT EXISTS idx_user_seasons_user_id ON user_seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_seasons_season_id ON user_seasons(season_id);
CREATE INDEX IF NOT EXISTS idx_user_seasons_user_season ON user_seasons(user_id, season_id);

-- Password reset tokens index
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA (Initial admin user)
-- ═══════════════════════════════════════════════════════════════════

-- Insert admin user (only if not exists)
INSERT OR IGNORE INTO users (username, role, balance, password, display_name, approved)
VALUES ('admin', 'admin', 1000, 'admin123', 'Admin', 1);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('winner', NULL);
