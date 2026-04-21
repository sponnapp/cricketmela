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
        : `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/google/callback`
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

                    // Send both emails: confirmation to user + notification to admin
                    // Load settings ONCE and reuse transporter to avoid DB lock conflicts
                    try {
                      const emailService = require('../email');
                      const appLink = process.env.NODE_ENV === 'production'
                        ? 'https://cricketmela.pages.dev'
                        : 'http://localhost:5173';
                      const approvalLink = process.env.NODE_ENV === 'production'
                        ? 'https://cricketmela.pages.dev/?page=admin&adminTab=users'
                        : 'http://localhost:5173/?page=admin&adminTab=users';

                      emailService.getEmailSettings((settingsErr, settings) => {
                        if (settingsErr || !settings) {
                          console.log('[GOOGLE SIGNUP] Email settings not configured – skipping emails');
                          return;
                        }
                        const transporter = emailService.createTransporter(settings);
                        if (!transporter) {
                          console.log('[GOOGLE SIGNUP] Transporter could not be created – skipping emails');
                          return;
                        }

                        const fromEmail = settings.from || settings.user;

                        // Email 1: Confirmation to the new user
                        const confirmMailOptions = {
                          from: fromEmail,
                          to: newUser.email,
                          subject: 'Welcome to Cricket Mela – Signup Request Received',
                          html: `
                            <h2>Welcome to Cricket Mela! 🏏</h2>
                            <p>Hello <strong>${newUser.display_name}</strong>,</p>
                            <p>Thank you for signing up with Google! Your request has been received and is pending admin approval.</p>
                            <br/>
                            <p><strong>Your Details:</strong></p>
                            <ul>
                              <li><strong>Username:</strong> ${newUser.username}</li>
                              <li><strong>Email:</strong> ${newUser.email}</li>
                            </ul>
                            <br/>
                            <p>You will receive another email once your account is approved. After approval, you can log in and start placing bets on your favourite IPL matches!</p>
                            <br/>
                            <p><a href="${appLink}" style="background-color:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Visit Cricket Mela</a></p>
                            <br/>
                            <p style="color:#999;font-size:12px;">If you did not sign up for this account, please ignore this email.</p>
                          `
                        };

                        console.log(`[GOOGLE SIGNUP] Sending confirmation email to: ${newUser.email}`);
                        transporter.sendMail(confirmMailOptions, (confirmErr, confirmInfo) => {
                          if (confirmErr) {
                            console.log(`[GOOGLE SIGNUP] ❌ Confirmation email failed:`, confirmErr.message);
                          } else {
                            console.log(`[GOOGLE SIGNUP] ✅ Confirmation email sent to ${newUser.email}:`, confirmInfo.response);
                          }

                          // Email 2: Admin notification
                          const dbForAdmin = openDb();
                          dbForAdmin.all(
                            "SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != 'xyz@xyz.com'",
                            (adminQueryErr, adminRows) => {
                              dbForAdmin.close();
                              const adminEmails = adminRows && adminRows.length > 0
                                ? adminRows.map(r => r.email).filter(Boolean)
                                : [fromEmail];

                              const adminMailOptions = {
                                from: fromEmail,
                                to: adminEmails.join(', '),
                                subject: `New User Signup – ${newUser.username}`,
                                html: `
                                  <h2>New User Signup Request</h2>
                                  <p><strong>Username:</strong> ${newUser.username}</p>
                                  <p><strong>Display Name:</strong> ${newUser.display_name}</p>
                                  <p><strong>Email:</strong> ${newUser.email}</p>
                                  <p><strong>Auth:</strong> Google OAuth</p>
                                  <br/>
                                  <p>Please log in to the admin panel to approve or reject this user.</p>
                                  <p><a href="${approvalLink}" style="background-color:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">View Pending Users</a></p>
                                `
                              };

                              console.log(`[GOOGLE SIGNUP] Sending admin notification to: ${adminEmails.join(', ')}`);
                              transporter.sendMail(adminMailOptions, (adminErr, adminInfo) => {
                                if (adminErr) {
                                  console.log(`[GOOGLE SIGNUP] ❌ Admin notification failed:`, adminErr.message);
                                } else {
                                  console.log(`[GOOGLE SIGNUP] ✅ Admin notification sent to ${adminEmails.length} admin(s):`, adminInfo.response);
                                }
                              });
                            }
                          );
                        });
                      });
                    } catch (emailError) {
                      console.log('[GOOGLE SIGNUP] Email service error:', emailError.message);
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

