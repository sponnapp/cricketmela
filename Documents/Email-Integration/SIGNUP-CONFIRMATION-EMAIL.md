# Signup Confirmation Email Feature

## Overview

When a new user submits their signup request, they now receive two automated emails:

1. **Signup Confirmation Email** → Sent to the user (NEW)
2. **Admin Notification Email** → Sent to all admin users (existing)

---

## User Experience Flow

### Step 1: User Submits Signup
- User fills signup form with username, password, and email
- Clicks "CREATE ACCOUNT" button

### Step 2: User Receives Confirmation Email
- **Recipient:** User's email address
- **Subject:** "Welcome to Cricket Mela - Signup Request Received"
- **Content Includes:**
  - Welcome message
  - Username and email confirmation
  - Notification that signup is under admin review
  - Information about receiving another email upon approval
  - Link to Cricket Mela app

### Step 3: Admin Receives Notification Email
- **Recipient:** All admin users with valid email addresses
- **Subject:** "New User Signup - {username}"
- **Content Includes:**
  - User's username, display name, and email
  - Link to admin panel to approve/reject user

### Step 4: User Receives Approval Email
- Once admin approves the user, they receive approval notification
- Approval email contains login link

---

## Implementation Details

### Backend Changes

#### New Function: `sendSignupConfirmationEmail()` in `backend/email.js`
```javascript
function sendSignupConfirmationEmail(username, email, displayName, callback)
```
- Sends welcome/confirmation email to the user
- Uses email settings from database
- Formats email with welcome message and details
- Includes app link for reference
- Falls back gracefully if email not configured

#### Updated Endpoint: `POST /api/signup` in `backend/index.js`
```javascript
app.post('/api/signup', (req, res) => {
  // ... user validation ...
  
  // Send confirmation email to user
  emailService.sendSignupConfirmationEmail(username, email, finalDisplayName, (confirmErr) => {
    // Don't fail if email fails - email is optional
  });

  // Send admin notification email
  emailService.sendAdminSignupNotification(username, email, finalDisplayName, (adminErr) => {
    // Return success regardless of email status
  });
});
```

---

## Email Content

### Signup Confirmation Email
```
Subject: Welcome to Cricket Mela - Signup Request Received

Dear {username},

Thank you for signing up! Your signup request has been received and submitted for admin approval.

Your Details:
- Username: {username}
- Email: {email}

The admin will review your request and approve your account. You will receive another email notification once your account is approved.

Once approved, you can log in and start placing bets on your favorite IPL matches!

[Visit Cricket Mela Button]

If you did not sign up for this account, please ignore this email.
```

---

## Testing

### Prerequisites
1. Email settings configured in Admin Panel → Email tab
2. Gmail account with app password set up
3. Admin user with valid email address (not xyz@xyz.com)

### Test Steps

1. **Sign up as a new user:**
   - Go to login page
   - Click "Sign up now"
   - Fill: username, password, email
   - Click "CREATE ACCOUNT"

2. **Check user's email inbox:**
   - Should receive "Welcome to Cricket Mela - Signup Request Received" email
   - Email should include username and confirmation details

3. **Check admin email:**
   - Admin should receive "New User Signup - {username}" email
   - Email should have "View Pending Users" link

4. **Admin approves user:**
   - Admin logs in and approves the user
   - User should receive approval email

5. **Verify email content:**
   - All links work correctly
   - All information is accurate
   - Email formatting is clean and readable

---

## Fallback Behavior

If email is not configured or sending fails:

1. **User Signup:** Still succeeds (returns 201 with message)
2. **Confirmation Email:** Silently fails (logged as warning)
3. **Admin Notification:** Still attempts to send
4. **User Experience:** User sees success message, unaware if emails failed

This ensures email issues don't block the signup process.

---

## Production Considerations

- **Email Configuration Required:** Must be set in Admin Panel before emails are sent
- **Email Links:** Automatically adapt to production URL (cricketmela.pages.dev)
- **Logging:** All email operations logged in backend logs (check with `flyctl logs`)
- **Rate Limiting:** No built-in rate limiting - consider adding if spam becomes issue

---

## Future Enhancements

1. Add email verification link (confirm user controls the email)
2. Add email unsubscribe option
3. Add retry logic for failed email sends
4. Track email delivery status in database
5. Add email templates in database for admin customization

---

## Troubleshooting

### Users Not Receiving Confirmation Emails

1. **Check email configured:**
   ```bash
   # In browser console after logging in as admin
   # Go to Admin → Email tab
   # Verify "From Address" and password are set
   ```

2. **Check backend logs:**
   ```bash
   flyctl logs --follow
   # Look for: "Signup confirmation email sent to user"
   ```

3. **Check spam folder:**
   - Confirmation emails might be marked as spam
   - Ask admin to whitelist noreply@cricketmela.com

4. **Test email config:**
   - In Admin Panel → Email tab
   - Click "Save & Test Configuration"
   - Should receive test email

### Email Settings Not Working

- Verify Gmail account has 2-Step Verification enabled
- Verify app password (not regular password) is being used
- App password format: 16 characters from myaccount.google.com/apppasswords

