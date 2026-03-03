# Email Integration Setup Guide

## Overview
The Cricket Mela application now supports email notifications for:
1. **Admin Signup Notification**: Admin receives an email when a new user signs up
2. **User Approval Notification**: User receives an email when their account is approved by admin

## Setup Instructions

### Prerequisites
- A Gmail account (recommended for ease of setup)
- 2-Step Verification enabled on your Google Account
- Access to the Admin Panel in Cricket Mela

### Step 1: Enable Gmail App Passwords

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled:
   - Click "2-Step Verification"
   - Follow the prompts to set it up
3. Once 2-Step Verification is enabled, go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select:
   - **App**: Mail
   - **Device**: Windows Computer (or your device type)
5. Google will generate a 16-character password
6. Copy this password (you'll need it in the next step)

### Step 2: Configure Email Settings in Cricket Mela

1. Log in to the application as Admin
2. Go to **Admin Panel** → **Email** tab
3. Fill in the following fields:
   - **Gmail Address**: Your full Gmail address (e.g., `admin@gmail.com`)
   - **App Password**: The 16-character password generated in Step 1
   - **From Email Address** (Optional): Custom "From" address for emails (e.g., `noreply@cricketmela.com`)
     - If left empty, the Gmail address will be used

4. Click **"Save & Test Configuration"**
   - The system will save the settings
   - A test email will be sent to verify the configuration works
   - You'll see a success message if everything is configured correctly

### Step 3: Verify Email Functionality

After saving the configuration:

1. **Test with a new signup**:
   - Log out of the application
   - Click "Sign up now" 
   - Create a new test account with email address
   - Admin should receive an email notification about the signup
   
2. **Test approval email**:
   - Go to Admin Panel → Users → Pending Approvals
   - Click "Approve" on the test user
   - Fill in the balance and assign seasons
   - Click "Approve"
   - The test user should receive an approval email at the email address they provided during signup

## Email Templates

### Admin Signup Notification
When a user signs up, the admin receives:
- Username
- Display Name
- Email Address
- Link to the pending users page

### User Approval Notification
When a user is approved, they receive:
- Confirmation that their account has been approved
- Username (for login)
- Link to the login page

## Troubleshooting

### "Email settings not configured" Error
- Go to Admin Panel → Email
- Ensure Gmail Address and App Password are filled in
- Click "Save & Test Configuration"
- Check for error message

### "Invalid email configuration" Error
- Verify the Gmail address is correct (case-sensitive)
- Verify the 16-character app password is correct
- Make sure 2-Step Verification is enabled on your Gmail account
- Try generating a new app password

### Emails not being sent
- Check that SMTP settings are saved in the Admin Panel
- Verify the email server is running (check backend logs)
- Ensure 2-Step Verification is enabled on Gmail
- Check Gmail's "Less secure app access" - ensure app passwords are being used (not less secure apps)

### Email delivery to spam folder
- Ask recipients to add your email address to their contacts
- Ask them to check spam/promotional folders
- Update email template styling to avoid spam filters

## Backend API Endpoints

### Get Email Settings
```
GET /api/admin/email-settings
Header: x-user: admin
Response: { ok: true, config: { user, password, from } }
```

### Save Email Settings
```
POST /api/admin/email-settings
Header: x-user: admin
Body: { user: "email@gmail.com", password: "16-char-password", from: "optional-from@email.com" }
Response: { ok: true, message: "Settings saved and tested successfully" }
```

### Send Admin Signup Notification
Called automatically when a new user signs up via `/api/signup`

### Send User Approval Notification
Called automatically when admin approves a user via `/api/admin/users/:id/approve`

## Nodemailer Configuration

The application uses **Nodemailer** with Gmail SMTP:
- **Service**: Gmail
- **Auth Method**: Username + App Password (not regular password)
- **Security**: TLS/SSL enabled by default in Nodemailer

## Security Notes

1. **Never store passwords in code** - Use the database settings table
2. **Password field masked in UI** - Shows "***" instead of actual password
3. **HTTPS recommended** - For production, always use HTTPS
4. **2-Step Verification required** - Gmail won't allow regular passwords for app passwords
5. **Environment Variables** - In production, consider using environment variables for email config

## Database Schema

Email configuration is stored in the `settings` table:
```sql
INSERT INTO settings (key, value) VALUES 
('email_config', '{"user":"admin@gmail.com","password":"xxxx xxxx xxxx xxxx","from":"noreply@cricketmela.com"}')
```

## Environment Variables (Optional)

For production deployment, you can set:
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=16-char-app-password
GMAIL_FROM=noreply@cricketmela.com
```

Then update email.js to read from environment variables if they exist.

## Files Modified

1. **backend/index.js**:
   - Added email module import
   - Updated `/api/signup` to send admin notification
   - Updated `/api/admin/users/:id/approve` to send approval email
   - Added `/api/admin/email-settings` GET endpoint
   - Added `/api/admin/email-settings` POST endpoint

2. **backend/email.js** (NEW):
   - Created email service module
   - sendAdminSignupNotification()
   - sendApprovalEmail()
   - getEmailSettings()
   - testEmailConfig()
   - createTransporter()

3. **backend/db.js**:
   - Added email column migration to users table

4. **backend/package.json**:
   - Added nodemailer dependency

5. **frontend/src/Admin.jsx**:
   - Added email settings state
   - Added fetchEmailSettings() and saveEmailSettings()
   - Added email settings tab in admin panel
   - Added email configuration UI

## Next Steps

1. Configure email settings in the Admin Panel
2. Test with a signup and approval flow
3. Monitor backend logs for any email-related errors
4. Customize email templates if needed (in backend/email.js)
5. Consider implementing email notification for other events (password reset, match results, etc.)


