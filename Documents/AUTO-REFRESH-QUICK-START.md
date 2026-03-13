# 30-Second Auto-Refresh - Quick Reference

## ✅ What Was Implemented

A 30-second auto-refresh mechanism that automatically updates data across all pages without requiring users to manually refresh their browser.

## 🎯 How It Works

```
Every 30 seconds:
  1. Check for new version (version.json)
  2. Trigger refresh callback
  3. Increment refreshTrigger state
  4. All components re-fetch their data
  5. UI updates with latest data
```

## 📋 Testing Instructions

### Local Testing (Recommended First)

1. **Start the application:**
   ```bash
   cd /Users/senthilponnappan/IdeaProjects/Test
   ./restart-all.sh
   ```

2. **Open browser:**
   - Navigate to `http://localhost:5173`
   - Login with any user

3. **Test auto-refresh:**
   - Open the Matches page
   - In another browser tab, login as admin
   - Change match odds or set a winner
   - Wait 30 seconds
   - First tab should automatically update with changes (no manual refresh needed)

4. **Test multiple pages:**
   - **Seasons page**: Create a new season as admin, user tab updates in 30s
   - **Matches page**: Vote for a match, odds update in 30s
   - **Vote History**: Submit vote, history updates in 30s
   - **Standings**: Set match winner as admin, leaderboard updates in 30s
   - **Admin panel**: All tabs refresh data every 30s

### Visual Indicators to Watch

- Check browser console: You won't see errors
- Network tab: Look for API calls every 30 seconds
- Data changes: Make a change as admin, watch user view update in 30s
- Vote persistence: Your radio button selections stay selected during refresh

## 🚀 Deployment to Production

1. **Build and test locally first:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy frontend to Cloudflare:**
   ```bash
   ./deploy-cf-simple.sh
   ```

3. **No backend changes needed** - This is frontend-only feature

4. **Verify in production:**
   - Visit `https://cricketmela.pages.dev`
   - Login and test same scenarios as local
   - Confirm 30-second refresh works

## 📊 What Gets Refreshed

| Page | What Updates Every 30s |
|------|------------------------|
| **Seasons** | Season list, match counts |
| **Matches** | Match details, odds (T1/T2), vote status, countdown timers |
| **Vote History** | All votes, points gained/lost, total payout |
| **Standings** | Leaderboard rankings, user balances |
| **Admin > Seasons** | Season list, match counts for all seasons |
| **Admin > Matches** | Match list, odds, vote counts, winner status |
| **Admin > Users** | User list, balances, pending approvals |
| **Admin > Email** | Email settings (no change) |

## ⚠️ Important Notes

- **Profile page excluded**: Intentionally NOT auto-refreshed to avoid disrupting user edits
- **Only when logged in**: Auto-refresh only runs for authenticated users
- **Vote preservation**: Your selected votes remain selected during refresh
- **Network resilient**: Silent failures if network unavailable

## 🔧 Configuration

To change the refresh interval, edit `/frontend/src/useVersionCheck.js`:

```javascript
const POLL_INTERVAL_MS = 30 * 1000   // 30 seconds
```

Change to:
- `15 * 1000` for 15 seconds (more responsive)
- `60 * 1000` for 60 seconds (less frequent)

## 🐛 Troubleshooting

### Issue: Data not refreshing
**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Look in Network tab for API calls every 30s
4. Verify you're logged in

### Issue: Votes disappearing
**Solution:**
- This should NOT happen - votes are preserved during refresh
- If it does, check `Matches.jsx` line 18-24 (vote state management)

### Issue: Page goes blank
**Solution:**
1. Check browser console for errors
2. Rebuild frontend: `cd frontend && npm run build`
3. Clear browser cache (Cmd+Shift+R)

### Issue: Too many API calls
**Solution:**
- Each component fetches independently every 30s
- This is normal and efficient
- Backend can handle the load

## 📖 Documentation

- **Full Implementation**: `/Documents/AUTO-REFRESH-IMPLEMENTATION.md`
- **Copilot Instructions**: `/.github/copilot-instructions.md` (Auto-Refresh section)

## ✨ Next Steps

1. Test in local environment
2. Verify all pages update correctly
3. Check vote preservation works
4. Deploy to production
5. Monitor for any issues
6. Consider adding "Last updated: Xs ago" indicator (future enhancement)

---

**Status**: ✅ Ready to test  
**Build Status**: ✅ Builds successfully  
**No Breaking Changes**: ✅ All existing functionality preserved

