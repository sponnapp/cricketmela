const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'data.db');

// Get email settings from database
function getEmailSettings(callback) {
  const db = new sqlite3.Database(DB_PATH);

  // Ensure settings table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `, (createErr) => {
    if (createErr) {
      db.close();
      return callback(createErr, null);
    }

    db.get("SELECT value FROM settings WHERE key = 'email_config'", (err, row) => {
      db.close();
      if (err || !row) {
        return callback(null, null);
      }
      try {
        const config = JSON.parse(row.value);
        callback(null, config);
      } catch (e) {
        callback(null, null);
      }
    });
  });
}

// Create transporter with current settings
function createTransporter(config) {
  if (!config || !config.user || !config.password) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.password
    }
  });
}

// Send email to admin when new user signs up
function sendAdminSignupNotification(username, email, displayName, callback) {
  getEmailSettings((err, settings) => {
    if (err || !settings) {
      console.log('Email settings not configured');
      return callback(new Error('Email settings not configured'));
    }

    const transporter = createTransporter(settings);
    if (!transporter) {
      console.log('Email transporter could not be created');
      return callback(new Error('Email service not configured'));
    }

    // Get all admin users from database
    const db = new sqlite3.Database(DB_PATH);

    // First, get ALL admin users to see what we have
    db.all("SELECT username, email FROM users WHERE role = 'admin'", (err, allRows) => {
      if (!err && allRows) {
        console.log('[DEBUG] All admin users in DB:', JSON.stringify(allRows));
      }

      // Now get admin users with valid emails
      db.all("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != 'xyz@xyz.com'", (err, rows) => {
        db.close();

        if (err) {
          console.log('Database error querying admin emails:', err);
          return callback(new Error('Failed to fetch admin emails'));
        }

        console.log('[DEBUG] Admin users with valid emails found:', rows ? rows.length : 0, rows);

        if (!rows || rows.length === 0) {
          console.log('No admin users with valid email addresses found. Falling back to settings.from');
          // Fall back to sending to the configured "from" email for now
          // This maintains backward compatibility
          const mailOptions = {
            from: settings.from || 'noreply@cricketmela.com',
            to: settings.from || 'noreply@cricketmela.com',
            subject: `New User Signup - ${username}`,
            html: `
              <h2>New User Signup Request</h2>
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Display Name:</strong> ${displayName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <br/>
              <p>Please log in to the admin panel to approve or reject this user.</p>
            `
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log('Email sending error:', error);
              callback(error);
            } else {
              console.log('Signup notification sent to configured email:', info.response);
              callback(null, info);
            }
          });
          return;
        }

        // Extract email addresses
        const adminEmails = rows.map(row => row.email).filter(e => e);
        console.log('[DEBUG] Extracted admin emails:', adminEmails);

        if (adminEmails.length === 0) {
          console.log('No admin users with valid email addresses found');
          return callback(new Error('No admin users configured with email'));
        }

      const fromEmail = settings.from || 'noreply@cricketmela.com';
      const approvalLink = process.env.NODE_ENV === 'production'
        ? 'https://cricketmela.pages.dev/?page=admin&adminTab=users'
        : 'http://localhost:5173/?page=admin&adminTab=users';

      const mailOptions = {
        from: fromEmail,
        to: adminEmails.join(', '),
        subject: `New User Signup - ${username}`,
        html: `
          <h2>New User Signup Request</h2>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Display Name:</strong> ${displayName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <br/>
          <p>Please log in to the admin panel to approve or reject this user.</p>
          <p><a href="${approvalLink}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Pending Users</a></p>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Email sending error:', error);
          callback(error);
        } else {
          console.log(`Admin notification sent to ${adminEmails.length} admin(s):`, info.response);
          callback(null, info);
        }
      });
      });
    });
  });
}

// Send approval email to user
function sendApprovalEmail(username, email, displayName, callback) {
  getEmailSettings((err, settings) => {
    if (err || !settings) {
      console.log('Email settings not configured');
      return callback(new Error('Email settings not configured'));
    }

    const transporter = createTransporter(settings);
    if (!transporter) {
      console.log('Email transporter could not be created');
      return callback(new Error('Email service not configured'));
    }

    const adminEmail = settings.from || 'noreply@cricketmela.com';
    const loginLink = process.env.NODE_ENV === 'production'
      ? 'https://cricketmela.pages.dev'
      : 'http://localhost:5173';

    const mailOptions = {
      from: adminEmail,
      to: email,
      subject: 'Your Cricket Mela Account Approved',
      html: `
        <h2>Welcome to Cricket Mela!</h2>
        <p>Hello ${displayName},</p>
        <p>Your account has been approved by the admin. You can now log in and start betting on your favorite IPL matches.</p>
        <br/>
        <p><strong>Username:</strong> ${username}</p>
        <br/>
        <p><a href="${loginLink}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Cricket Mela</a></p>
        <br/>
        <p>Good luck with your picks!</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Email sending error:', error);
        callback(error);
      } else {
        console.log('Approval email sent to user:', info.response);
        callback(null, info);
      }
    });
  });
}

// Send confirmation email to user when they successfully sign up
function sendSignupConfirmationEmail(username, email, displayName, callback) {
  getEmailSettings((err, settings) => {
    if (err || !settings) {
      console.log('Email settings not configured');
      return callback(new Error('Email settings not configured'));
    }

    const transporter = createTransporter(settings);
    if (!transporter) {
      console.log('Email transporter could not be created');
      return callback(new Error('Email service not configured'));
    }

    const fromEmail = settings.from || 'noreply@cricketmela.com';
    const appLink = process.env.NODE_ENV === 'production'
      ? 'https://cricketmela.pages.dev'
      : 'http://localhost:5173';

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Welcome to Cricket Mela - Signup Request Received',
      html: `
        <h2>Welcome to Cricket Mela!</h2>
        <p>Hello ${displayName},</p>
        <p>Thank you for signing up! Your signup request has been received and submitted for admin approval.</p>
        <br/>
        <p><strong>Your Details:</strong></p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Email:</strong> ${email}</li>
        </ul>
        <br/>
        <p>The admin will review your request and approve your account. You will receive another email notification once your account is approved.</p>
        <p>Once approved, you can log in and start placing bets on your favorite IPL matches!</p>
        <br/>
        <p><a href="${appLink}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Cricket Mela</a></p>
        <br/>
        <p style="color: #999; font-size: 12px;">If you did not sign up for this account, please ignore this email.</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Email sending error:', error);
        callback(error);
      } else {
        console.log('Signup confirmation email sent to user:', info.response);
        callback(null, info);
      }
    });
  });
}

// Send password reset email with secure link
function sendPasswordResetEmail(username, email, displayName, resetToken, callback) {
  getEmailSettings((err, settings) => {
    if (err || !settings) {
      console.log('[PASSWORD RESET] Email settings not configured');
      return callback(new Error('Email settings not configured'));
    }

    const transporter = createTransporter(settings);
    if (!transporter) {
      console.log('[PASSWORD RESET] Email transporter could not be created');
      return callback(new Error('Email service not configured'));
    }

    const fromEmail = settings.from || settings.user;
    const resetLink = process.env.NODE_ENV === 'production'
      ? `https://cricketmela.pages.dev/?page=reset-password&token=${resetToken}`
      : `http://localhost:5173/?page=reset-password&token=${resetToken}`;

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Cricket Mela – Password Reset Request',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1b2a;color:#ffffff;padding:30px;border-radius:10px;">
          <h2 style="color:#FFD700;text-align:center;">🏏 Cricket Mela</h2>
          <h3 style="color:#ffffff;">Password Reset Request</h3>
          <p>Hello <strong>${displayName || username}</strong>,</p>
          <p>We received a request to reset the password for your Cricket Mela account.</p>
          <p>Click the button below to reset your password. This link is valid for <strong>30 minutes</strong>.</p>
          <br/>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetLink}"
               style="background:linear-gradient(90deg,#e65c00,#f9d423);color:#1a0a00;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:900;font-size:15px;display:inline-block;letter-spacing:1px;">
              🔐 Reset My Password
            </a>
          </div>
          <br/>
          <p style="color:#aaa;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color:#acd8ff;font-size:12px;word-break:break-all;">${resetLink}</p>
          <br/>
          <p style="color:#aaa;font-size:13px;">If you did not request a password reset, please ignore this email. Your password will not be changed.</p>
          <p style="color:#aaa;font-size:13px;">This link expires in 30 minutes for security.</p>
          <hr style="border-color:rgba(255,220,80,0.3);margin:20px 0;"/>
          <p style="color:#888;font-size:11px;text-align:center;">Cricket Mela – IPL Prediction Game | Fun only, no real money involved</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('[PASSWORD RESET] Email sending error:', error);
        callback(error);
      } else {
        console.log('[PASSWORD RESET] Reset email sent to:', email, info.response);
        callback(null, info);
      }
    });
  });
}

// Test email configuration
function testEmailConfig(config, callback) {
  const transporter = createTransporter(config);
  if (!transporter) {
    return callback(new Error('Invalid email configuration'));
  }

  const testEmail = {
    from: config.from || config.user,
    to: config.user,
    subject: 'Cricket Mela - Email Configuration Test',
    html: '<h2>Email configuration is working!</h2><p>This is a test email from Cricket Mela.</p>'
  };

  transporter.sendMail(testEmail, (error, info) => {
    if (error) {
      callback(error);
    } else {
      callback(null, info);
    }
  });
}

module.exports = {
  sendAdminSignupNotification,
  sendApprovalEmail,
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
  getEmailSettings,
  testEmailConfig,
  createTransporter
};

