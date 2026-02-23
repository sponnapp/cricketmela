# Superuser Role Implementation

## Overview
Added a new "superuser" user role that has the ability to set match winners, just like the admin role. This allows delegation of match result management without giving full admin access.

## Role Hierarchy

```
Admin (Full Control)
  ├─ Manage seasons
  ├─ Manage users
  ├─ Approve pending users
  ├─ Set match winners ✓
  ├─ Upload match CSV
  └─ Other admin functions

Superuser (Limited Admin)
  └─ Set match winners ✓

Picker (Regular User)
  ├─ Vote on matches
  ├─ View vote history
  └─ View standings
```

## What's New

### 1. New Role Option in User Creation
When creating a new user in **Admin > Users > Create New User**, you now have three role options:
- **Picker** - Regular voting user with limited balance
- **Superuser** - Can set match winners (NEW)
- **Admin** - Full administrative access

### 2. Role Assignment in Edit User Modal
When editing an existing user, you can change their role from Picker to Superuser or Admin.

### 3. Visual Role Badge
User roles are displayed with distinct color badges in the users table:
- **Red** (#dc3545) - Admin
- **Orange** (#ff9800) - Superuser (NEW)
- **Green** (#28a745) - Picker

### 4. Backend Authorization
The "Set Winner" endpoint now accepts both:
- Admin role
- Superuser role

### 5. Admin Panel Access for Superusers
Superusers can now see the **Admin** tab in the main navigation. However, they only have access to the **Matches** section within the Admin panel. The Season and Users management tabs are hidden for superusers to keep them focused on match winner management.

## Files Modified

### Backend
- `/backend/index.js`
  - Updated `/api/admin/matches/:id/winner` endpoint to accept `['admin', 'superuser']` roles

### Frontend
- `/frontend/src/Admin.jsx`
  - Added "superuser" option to create user role dropdown
  - Added "superuser" option to edit user modal role dropdown
  - Updated role badge styling to display superuser in orange color

## How to Use

### Create a Superuser
1. Navigate to **Admin > Users** tab
2. Scroll to **"Create New User"** section
3. Fill in the form:
   - Username
   - Password
   - Display Name
   - Select **"Superuser"** from Role dropdown
   - Set Balance (initial points)
   - Select seasons (if desired)
4. Click **"Create User"**

### Convert Existing User to Superuser
1. Navigate to **Admin > Users** tab
2. Find the user in **"All Users"** table
3. Click **"Edit"** button
4. Change Role from "Picker" to "Superuser"
5. Click **"Save"**

### Superuser Can Now Set Winners
Once a user is a superuser:
1. Go to **Admin > Matches** tab
2. Find the match in **"Manage Matches"** section
3. Click **"Set Winner"** button
4. Select the winning team
5. Match winner is recorded and payouts are distributed

## Permission Summary

| Action | Admin | Superuser | Picker |
|--------|-------|-----------|--------|
| Set Match Winner | ✅ | ✅ | ❌ |
| Manage Seasons | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Approve New Users | ✅ | ❌ | ❌ |
| Upload CSV | ✅ | ❌ | ❌ |
| Clear Votes | ✅ | ❌ | ❌ |
| Vote on Matches | ❌ | ❌ | ✅ |

## Notes

- Superusers cannot see the Admin panel - only the regular user interface
- Superusers can vote on matches just like regular users
- Only admin can assign seasons to superusers during user creation
- Admin can demote superusers back to pickers at any time

## Backend Endpoint Details

**Endpoint:** `POST /api/admin/matches/:id/winner`

**Allowed Roles:** `admin`, `superuser`

**Request Body:**
```json
{
  "winner": "Team Name"
}
```

**Response:**
```json
{
  "ok": true,
  "distributed": 100,
  "autoLoss": 2
}
```

---

**Date**: February 22, 2026
**Status**: ✅ Implemented and Ready to Use

