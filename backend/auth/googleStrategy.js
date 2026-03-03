const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname + '/..';
const DB_PATH = path.join(DB_DIR, 'data.db');

function openDb() {
  return new sqlite3.Database(DB_PATH);
}

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://cricketmela-api.fly.dev/auth/google/callback'
        : 'http://localhost:4000/auth/google/callback'
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        const db = openDb();
        const googleId = profile.id;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const displayName = profile.displayName;

        if (!email) {
          db.close();
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists by google_id
        db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, user) => {
          if (err) {
            db.close();
            return done(err);
          }

          if (user) {
            // User exists with this Google account, log them in
            db.close();
            return done(null, user);
          }

          // Check if user exists by email (for linking existing accounts)
          db.get('SELECT * FROM users WHERE email = ?', [email], (err2, existingUser) => {
            if (err2) {
              db.close();
              return done(err2);
            }

            if (existingUser && !existingUser.google_id) {
              // Link Google account to existing email-based user
              db.run('UPDATE users SET google_id = ? WHERE id = ?',
                [googleId, existingUser.id],
                (err3) => {
                  if (err3) {
                    db.close();
                    return done(err3);
                  }

                  // Return updated user
                  db.get('SELECT * FROM users WHERE id = ?', [existingUser.id], (err4, updatedUser) => {
                    db.close();
                    if (err4) return done(err4);
                    console.log('Linked Google account to existing user:', email);
                    return done(null, updatedUser);
                  });
                }
              );
            } else if (existingUser && existingUser.google_id) {
              // User already linked to a different Google account
              db.close();
              return done(new Error('This email is already linked to a different Google account'));
            } else {
              // Create new user (pending approval)
              const username = email.split('@')[0];

              db.run(
                `INSERT INTO users (username, email, display_name, google_id, role, balance, approved)
                 VALUES (?, ?, ?, ?, 'picker', 0, 0)`,
                [username, email, displayName, googleId],
                function(err4) {
                  if (err4) {
                    db.close();
                    console.error('Error creating new Google user:', err4);
                    return done(err4);
                  }

                  const newUserId = this.lastID;
                  db.get('SELECT * FROM users WHERE id = ?', [newUserId], (err5, newUser) => {
                    db.close();
                    if (err5) return done(err5);

                    // Send admin notification email
                    try {
                      const emailService = require('../email');
                      emailService.sendAdminSignupNotification(
                        newUser.username,
                        newUser.email,
                        newUser.display_name,
                        (emailErr) => {
                          if (emailErr) {
                            console.log('Warning: Could not send admin notification email:', emailErr.message);
                          }
                        }
                      );
                    } catch (emailError) {
                      console.log('Email service not available:', emailError.message);
                    }

                    console.log('Created new Google user (pending approval):', email);
                    return done(null, newUser);
                  });
                }
              );
            }
          });
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const db = openDb();
    db.get('SELECT id, username, display_name, role, balance, approved, email, google_id FROM users WHERE id = ?', [id], (err, user) => {
      db.close();
      if (err) {
        return done(err);
      }
      // If user not found (deleted), return null without error
      // This prevents session deserialization errors
      done(null, user || null);
    });
  });
};

