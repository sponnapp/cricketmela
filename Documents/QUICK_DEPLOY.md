# Quick Start Deployment Guide

Follow these steps to deploy Cricket Mela to production.

## Prerequisites Checklist

- [ ] GitHub account with code pushed
- [ ] Cloudflare account (free) - https://dash.cloudflare.com/sign-up
- [ ] Fly.io account (free) - https://fly.io/app/sign-up

## Step 1: Install Fly CLI (5 minutes)

```bash
# On macOS
brew install flyctl

# Verify installation
flyctl version
```

## Step 2: Deploy Backend to Fly.io (10 minutes)

```bash
# Login to Fly.io
flyctl auth login

# Run the deployment script
./deploy-backend.sh
```

**Follow the prompts:**
1. Choose app name (e.g., `cricketmela-api`)
2. Choose region closest to you
3. Say NO to PostgreSQL
4. Say NO to Redis

**After deployment:**
- Note your backend URL: `https://your-app-name.fly.dev`
- Test it: `curl https://your-app-name.fly.dev/api/health`

## Step 3: Deploy Frontend to Cloudflare Pages (10 minutes)

### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to https://dash.cloudflare.com/
2. Click **Workers & Pages** → **Pages**
3. Click **Create application** → **Connect to Git**
4. Authorize GitHub and select `sponnapp/cricketmela`
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
6. Add environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-app-name.fly.dev` (your Fly.io URL)
7. Click **Save and Deploy**

### Option B: Via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy from frontend directory
cd frontend
wrangler pages deploy dist --project-name=cricketmela
```

## Step 4: Test Your Deployment (5 minutes)

1. Open your Cloudflare Pages URL (e.g., `https://cricketmela.pages.dev`)
2. Try logging in with existing credentials
3. Check if matches are loading
4. Test voting functionality

## Step 5: Update Git Ignores

Make sure you have proper .gitignore files:

```bash
# Add to backend/.gitignore
echo "data.db" >> backend/.gitignore
echo "backend.log" >> backend/.gitignore
echo ".env" >> backend/.gitignore

# Add to frontend/.gitignore  
echo ".env" >> frontend/.gitignore
echo ".env.local" >> frontend/.gitignore
```

## Common Issues & Solutions

### Issue: CORS errors

**Solution:** Update backend `index.js` CORS settings with your Cloudflare Pages domain:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://cricketmela.pages.dev',  // Your actual domain
];
```

### Issue: Frontend shows "Failed to fetch"

**Solution:** Check environment variable in Cloudflare Pages:
- Go to Settings → Environment variables
- Verify `VITE_API_URL` is set correctly

### Issue: Database not persisting on Fly.io

**Solution:** Verify volume is created and mounted:
```bash
flyctl volumes list
# Should show: cricket_data
```

### Issue: Build fails on Cloudflare Pages

**Solution:** Check build command includes `cd frontend`:
```
cd frontend && npm install && npm run build
```

## Useful Commands

```bash
# Backend (Fly.io)
flyctl status                          # Check app status
flyctl logs                            # View logs
flyctl logs -f                         # Tail logs
flyctl ssh console                     # SSH into container
./backup-database.sh                   # Backup database

# Frontend (Cloudflare Pages)
# Automatically deploys on git push!

# To redeploy
git add .
git commit -m "Update"
git push origin main
```

## Setting Up Custom Domain (Optional)

### Frontend Domain

1. Go to Cloudflare Pages → Your project → Custom domains
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `cricketmela.com`)
4. Follow DNS instructions

### Backend Domain

```bash
flyctl certs create api.cricketmela.com
```

Then update DNS with provided values.

## Database Management

### Backup Database

```bash
./backup-database.sh
```

Backups are saved to `./backups/` directory.

### Restore Database

```bash
# Upload backup to Fly.io
flyctl ssh sftp shell
put backups/cricketmela_backup_20260222_120000.db /app/data/data.db
exit

# Restart app
flyctl restart
```

## Monitoring

### View Backend Logs
```bash
flyctl logs -f
```

### View Frontend Analytics
- Go to Cloudflare Pages dashboard
- Click on your project → Analytics

## Cost Breakdown

### Free Tier Limits

**Cloudflare Pages (Free Forever):**
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ 500 builds/month
- ✅ Free SSL

**Fly.io (Free Tier):**
- ✅ 3 shared VMs (256MB RAM each)
- ✅ 3GB persistent storage
- ✅ 160GB outbound data

**Total:** $0/month for typical usage!

## Next Steps

1. Set up automated database backups (cron job)
2. Configure custom domains
3. Set up monitoring alerts
4. Add staging environment
5. Implement CI/CD with GitHub Actions

## Support

- **Fly.io Docs:** https://fly.io/docs/
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Issues:** Check deployment logs for errors

---

**Need Help?** 
- Fly.io community: https://community.fly.io/
- Cloudflare community: https://community.cloudflare.com/

---

Last updated: February 22, 2026

