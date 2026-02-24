# 🚀 Deployment Scripts

This directory contains scripts to deploy Cricket Mela to production.

## Frontend Deployment to Cloudflare Pages

### Quick Deploy

Run this command from the project root:

```bash
./deploy-cf-simple.sh
```

### What it does:

1. ✅ Builds the frontend (`npm install && npm run build`)
2. ✅ Deploys to Cloudflare Pages using Wrangler
3. ✅ Updates your live site at https://cricketmela.pages.dev

### Prerequisites:

- Node.js and npm installed
- Wrangler CLI (will be installed automatically if missing)
- Cloudflare account with Pages project "cricketmela" set up

### First-time setup:

If this is your first time deploying, you'll need to authenticate with Cloudflare:

```bash
npx wrangler login
```

This will open a browser window to authorize the CLI.

---

## Backend Deployment to Fly.io

To deploy the backend:

```bash
cd backend
flyctl deploy
```

**Backend URL**: https://cricketmela-api.fly.dev

---

## Complete Deployment (Both Frontend and Backend)

### 1. Deploy Backend First:

```bash
cd backend
flyctl deploy
cd ..
```

### 2. Deploy Frontend:

```bash
./deploy-cf-simple.sh
```

---

## Verify Deployment

### Check Backend:
```bash
curl https://cricketmela-api.fly.dev/api/health
```
Expected: `{"status":"ok"}`

### Check Frontend:
Open in browser: https://cricketmela.pages.dev

---

## Troubleshooting

### Issue: "wrangler: command not found"
**Solution**: Install Wrangler globally
```bash
npm install -g wrangler
```

### Issue: "Not authenticated"
**Solution**: Login to Cloudflare
```bash
wrangler login
```

### Issue: "Project not found"
**Solution**: Create the project on Cloudflare Pages dashboard first
1. Go to https://dash.cloudflare.com/
2. Navigate to Pages
3. Create a new project named "cricketmela"

### Issue: API calls failing (405 errors)
**Solution**: Ensure `frontend/public/_redirects` contains:
```
/api/*  https://cricketmela-api.fly.dev/api/:splat  200
/*    /index.html   200
```

---

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://cricketmela.pages.dev |
| Backend API | https://cricketmela-api.fly.dev |
| GitHub Repo | https://github.com/sponnapp/cricketmela |

---

## Notes

- Frontend automatically deploys on GitHub push (if connected)
- Manual deployment with this script overrides automatic deployment
- Backend data persists in Fly.io volume (won't be lost on redeploy)
- Always test locally before deploying to production

---

**Happy Deploying! 🏏🎉**

