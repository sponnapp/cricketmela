# Email Integration - Quick Test Guide

## Prerequisites
- Gmail account with 2-Step Verification enabled
- App password generated from myaccount.google.com/apppasswords
- Backend and frontend running locally

## Step-by-Step Test

### 1. Start the Application
```bash
cd /Users/senthilponnappan/IdeaProjects/Test
./restart-all.sh
```

Wait for both frontend and backend to start successfully.

### 2. Configure Email Settings
1. Open http://localhost:5173 in browser
2. Log in as admin (admin / admin123)
3. Click "Admin Panel"
4. Click "📧 Email" tab
5. Fill in:
   - **Gmail Address**: your-gmail@gmail.com
   - **App Password**: 16-character app password
   - **From Address** (optional): noreply@cricketmela.com
6. Click "Save & Test Configuration"
7. Check your Gmail for test email (might be in Promotions tab)

### 3. Test New User Signup
1. Log out from the application
2. Click "Sign up now"
3. Fill in:
   - Username: testuser1
   - Password: testpass123
   - Display Name: Test User
   - Email: your-test-email@gmail.com
4. Click "Sign up"
5. Check your Gmail inbox for admin notification email
   - Should show testuser1, Test User, your-test-email@gmail.com
   - Should have link to approve users

### 4. Test User Approval
1. Go to Admin Panel → 👥 Users → Pending Approvals
2. Click "Approve" on testuser1
3. Set Initial Balance: 500
4. Assign Seasons: Select at least one season
5. Click "Approve"
6. Check your-test-email@gmail.com for approval confirmation
   - Should show welcome message
   - Should show username (testuser1)
   - Should have login link

### 5. Test Login with Approved User
1. Log out from the application
2. Log in as testuser1 with password testpass123
3. Should successfully log in
4. Should be able to view seasons and vote

## What to Check

### Email Should Contain:
- ✅ Correct HTML formatting
- ✅ Proper subject lines
- ✅ User details (username, display name, email)
- ✅ Actionable links (approve page, login page)
- ✅ Professional appearance

### Admin Notification Email:
- Subject: "New User Signup - [username]"
- Contains: Username, Display Name, Email, Approve link

### Approval Email:
- Subject: "Your Cricket Mela Account Approved"
- Contains: Welcome message, Username, Login link

## Troubleshooting During Test

### Issue: "Email settings not configured"
**Action**: Make sure you clicked "Save & Test Configuration" in the Email tab

### Issue: Test email not received
**Action**: 
- Check Gmail "Promotions" tab
- Check spam folder
- Verify app password is 16 characters
- Verify 2-Step Verification is enabled on Gmail
- Check backend logs for errors

### Issue: Signup email to admin not sent
**Action**:
- Log out and sign up again
- Check backend logs (should see email sending attempt)
- Verify email configuration is still set (check Admin Panel → Email)

### Issue: Approval email not sent to user
**Action**:
- Make sure user provided valid email during signup
- Check admin panel - user record should have email field
- Try approving different user

## Expected Behavior

### When Everything Works:
1. ✅ Save & Test Configuration sends test email
2. ✅ New signup triggers admin notification
3. ✅ User approval triggers user approval email
4. ✅ Both emails have correct formatting
5. ✅ Links in emails are clickable
6. ✅ No errors in backend console

### Graceful Degradation:
- ✅ If email config not set, signup still works
- ✅ If email config fails, user operations continue
- ✅ Error messages are user-friendly

## Backend Logs to Check

When running backend, look for these messages:

### Success Messages:
```
✅ Successfully added email column to users table
Email sending attempt: Admin notification sent
Approval email sent to user
```

### Error Messages:
```
Email settings not configured
Email transporter could not be created
Error sending email
```

## Files to Check During Testing

### Backend
- `backend/email.js` - Email service module
- `backend/index.js` - Look for email sending lines (around line 860 for signup, line 690 for approval)

### Frontend
- `frontend/src/Admin.jsx` - Email settings UI (search for "email")
- Browser console - Check for any JavaScript errors

### Database
- Email config stored in: `settings` table with key `email_config`
- User email stored in: `users` table, `email` column

## Performance Considerations

- Email sending is asynchronous (non-blocking)
- If email fails, user operations continue unaffected
- No performance impact on regular voting/match operations

## Security Notes During Testing

- Don't commit real Gmail credentials to git
- Use app passwords, not regular passwords
- Clear test data after testing
- Don't share email configuration with others

## Next Steps After Testing

1. Verify all emails are being received
2. Check email formatting matches expectations
3. Test with multiple users
4. Verify emails work in production (if deploying)
5. Consider customizing email templates in backend/email.js

## Reference Commands

### Check Email Settings in Database
```bash
sqlite3 backend/data.db "SELECT * FROM settings WHERE key='email_config';"
```

### Check User Email Addresses
```bash
sqlite3 backend/data.db "SELECT username, email, approved FROM users;"
```

### View Backend Logs
```bash
# If running in foreground, you'll see logs directly
# If running in background, check recent logs
tail -f backend.log
```

### Test Email Configuration Manually
```bash
# Can modify backend/email.js to add manual testing function
node -e "const email = require('./backend/email'); email.testEmailConfig({user: 'test@gmail.com', password: 'xxxx xxxx xxxx xxxx', from: 'test@gmail.com'}, (err, info) => console.log(err || info));"
```


