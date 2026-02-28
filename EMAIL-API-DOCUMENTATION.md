# Email Integration - API Documentation

## Email Settings Endpoints

### GET /api/admin/email-settings
**Purpose**: Retrieve current email configuration

**Access**: Requires admin role

**Request**:
```
GET /api/admin/email-settings
Header: x-user: admin
```

**Response (Success)**:
```json
{
  "ok": true,
  "config": {
    "user": "admin@gmail.com",
    "password": "***",
    "from": "noreply@cricketmela.com"
  }
}
```

**Response (No Config Set)**:
```json
{
  "ok": true,
  "config": null
}
```

**Notes**:
- Password field is masked as "***" for security
- Returns null if no email configuration has been saved

---

### POST /api/admin/email-settings
**Purpose**: Save and test email configuration

**Access**: Requires admin role

**Request**:
```
POST /api/admin/email-settings
Header: x-user: admin
Content-Type: application/json

{
  "user": "admin@gmail.com",
  "password": "xxxx xxxx xxxx xxxx",
  "from": "noreply@cricketmela.com"
}
```

**Required Fields**:
- `user` (string): Gmail address
- `password` (string): 16-character app password

**Optional Fields**:
- `from` (string): Custom "From" email address

**Response (Success)**:
```json
{
  "ok": true,
  "message": "Email settings saved and tested successfully"
}
```

**Response (Missing Fields)**:
```json
{
  "error": "Email user and password are required",
  "status": 400
}
```

**Response (Invalid Config)**:
```json
{
  "ok": false,
  "message": "Email configuration saved but test failed: Error message"
}
```

**Notes**:
- Configuration is saved even if test email fails
- Test email is sent to the Gmail account itself
- If email fails, the message will indicate the issue
- Password is stored in database, never logged

---

## Integrated Endpoints

### POST /api/signup
**Changes**: Now automatically sends admin notification email

**Email Trigger**:
- When: New user submits signup form
- To: Admin (Gmail account from configuration)
- Content: Username, display name, email, link to approve users
- Failure: Non-blocking (signup succeeds even if email fails)

**Example**:
```
POST /api/signup
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "display_name": "New User",
  "email": "newuser@example.com"
}
```

**Email Sent**:
```
From: noreply@cricketmela.com (or from field if set)
To: admin@gmail.com
Subject: New User Signup - newuser
Body: HTML email with user details and approve link
```

---

### POST /api/admin/users/:id/approve
**Changes**: Now automatically sends approval email to user

**Email Trigger**:
- When: Admin approves a pending user
- To: User's email address (from signup)
- Content: Welcome message, username, login link
- Failure: Non-blocking (approval succeeds even if email fails)

**Example**:
```
POST /api/admin/users/5/approve
Header: x-user: admin
Content-Type: application/json

{
  "balance": 500,
  "season_ids": [1, 2]
}
```

**Email Sent**:
```
From: noreply@cricketmela.com (or from field if set)
To: newuser@example.com
Subject: Your Cricket Mela Account Approved
Body: HTML email with welcome message and login link
```

---

## Backend Implementation Details

### Email Module (`backend/email.js`)

#### sendAdminSignupNotification(username, email, displayName, callback)
```javascript
// Parameters:
// - username: New user's username
// - email: New user's email address
// - displayName: New user's display name
// - callback: (err, info) => {}

// Returns on error: Error object
// Returns on success: Nodemailer info object

// Example:
emailService.sendAdminSignupNotification('testuser', 'test@example.com', 'Test User', (err, info) => {
  if (err) console.error('Email failed:', err);
  else console.log('Email sent:', info.response);
});
```

#### sendApprovalEmail(username, email, displayName, callback)
```javascript
// Parameters:
// - username: User's username
// - email: User's email address
// - displayName: User's display name
// - callback: (err, info) => {}

// Returns on error: Error object
// Returns on success: Nodemailer info object

// Example:
emailService.sendApprovalEmail('testuser', 'test@example.com', 'Test User', (err, info) => {
  if (err) console.error('Email failed:', err);
  else console.log('Email sent:', info.response);
});
```

#### getEmailSettings(callback)
```javascript
// Parameters:
// - callback: (err, config) => {}

// Returns on error: null config
// Returns on success: { user, password, from } object

// Example:
emailService.getEmailSettings((err, config) => {
  if (!config) console.log('Email not configured');
  else console.log('Using:', config.user);
});
```

#### testEmailConfig(config, callback)
```javascript
// Parameters:
// - config: { user, password, from }
// - callback: (err, info) => {}

// Returns on error: Error object
// Returns on success: Nodemailer info object

// Example:
emailService.testEmailConfig(config, (err, info) => {
  if (err) return res.status(500).json({ error: err.message });
  res.json({ ok: true, message: 'Test email sent successfully' });
});
```

---

## Database Schema Changes

### Settings Table
Email configuration is stored in the `settings` table:

```sql
-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Email config entry:
INSERT INTO settings (key, value) VALUES 
('email_config', '{"user":"admin@gmail.com","password":"xxxx xxxx xxxx xxxx","from":"noreply@cricketmela.com"}');
```

### Users Table
Added email column to store user email addresses:

```sql
-- Added column to users table:
ALTER TABLE users ADD COLUMN email TEXT DEFAULT 'xyz@xyz.com';

-- Usage:
SELECT username, email FROM users WHERE approved = 0;
```

---

## Error Handling

### Configuration Errors
```json
{
  "error": "Email user and password are required",
  "status": 400
}
```

### SMTP Connection Errors
```json
{
  "ok": false,
  "message": "Email configuration saved but test failed: Invalid login credentials"
}
```

### Database Errors
```json
{
  "error": "DB error: [error message]",
  "status": 500
}
```

---

## Email Content Examples

### Admin Signup Notification
```html
<h2>New User Signup Request</h2>
<p><strong>Username:</strong> testuser</p>
<p><strong>Display Name:</strong> Test User</p>
<p><strong>Email:</strong> testuser@example.com</p>
<br/>
<p>Please log in to the admin panel to approve or reject this user.</p>
<p><a href="http://localhost:5173/admin/approve-user" style="...">View Pending Users</a></p>
```

### User Approval Notification
```html
<h2>Welcome to Cricket Mela!</h2>
<p>Hello Test User,</p>
<p>Your account has been approved by the admin. You can now log in and start betting on your favorite IPL matches.</p>
<br/>
<p><strong>Username:</strong> testuser</p>
<br/>
<p><a href="http://localhost:5173" style="...">Login to Cricket Mela</a></p>
<br/>
<p>Good luck with your picks!</p>
```

---

## Configuration File Storage

Email settings are stored in SQLite as JSON:

```javascript
// Stored as:
{
  "key": "email_config",
  "value": "{\"user\":\"admin@gmail.com\",\"password\":\"xxxx xxxx xxxx xxxx\",\"from\":\"noreply@cricketmela.com\"}"
}

// Parsed to:
{
  "user": "admin@gmail.com",
  "password": "xxxx xxxx xxxx xxxx",
  "from": "noreply@cricketmela.com"
}
```

---

## Security Considerations

### Password Handling
- Stored in plain text in database (SQLite limitation)
- Masked in API responses as "***"
- Never logged to console
- Should be moved to environment variables for production

### SMTP Configuration
- Uses Gmail's official SMTP server
- Requires app password (not regular password)
- Requires 2-Step Verification on Gmail
- Connection is encrypted (TLS/SSL)

### Error Messages
- Email failures don't block user operations
- Errors are logged but not exposed to frontend
- Graceful degradation if email service is down

---

## Testing with cURL

### Get Email Settings
```bash
curl -X GET http://localhost:4000/api/admin/email-settings \
  -H "x-user: admin"
```

### Save Email Configuration
```bash
curl -X POST http://localhost:4000/api/admin/email-settings \
  -H "x-user: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "admin@gmail.com",
    "password": "xxxx xxxx xxxx xxxx",
    "from": "noreply@cricketmela.com"
  }'
```

### Test Signup with Email
```bash
curl -X POST http://localhost:4000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "display_name": "Test User",
    "email": "testuser@example.com"
  }'
```

### Approve User with Email
```bash
curl -X POST http://localhost:4000/api/admin/users/1/approve \
  -H "x-user: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "balance": 500,
    "season_ids": [1]
  }'
```

---

## Environment Variables (Future Enhancement)

For production deployment, consider using environment variables:

```bash
GMAIL_USER=admin@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
GMAIL_FROM=noreply@cricketmela.com
NODE_ENV=production
```

Update `backend/email.js` to read from environment variables if available.


