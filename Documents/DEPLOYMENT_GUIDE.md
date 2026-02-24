# Deployment Guide: Cricket Mela

This guide will walk you through deploying your application with:
- **Frontend**: Cloudflare Pages
- **Backend**: Fly.io (with SQLite database)
- **Source**: GitHub repository

## Prerequisites

1. GitHub account with your code pushed to: https://github.com/sponnapp/cricketmela.git
2. Cloudflare account (free tier works)
3. Fly.io account (free tier works)
4. Command-line tools:
   - Git installed
   - Node.js & npm installed
   - Fly CLI installed

---

## Part 1: Prepare Your Repository

### 1.1 Ensure your code is pushed to GitHub

```bash
cd /Users/senthilponnappan/IdeaProjects/Test
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## Part 2: Deploy Backend to Fly.io

### 2.1 Install Fly CLI

```bash
# On macOS
brew install flyctl

# Or use install script
curl -L https://fly.io/install.sh | sh
```

### 2.2 Login to Fly.io

```bash
flyctl auth login
```

### 2.3 Navigate to backend directory

```bash
cd backend
```

### 2.4 Initialize Fly.io app

```bash
flyctl launch
```

When prompted:
- **App name**: Choose a name (e.g., `cricketmela-api`)
- **Region**: Choose closest to your users
- **PostgreSQL**: Say **NO** (we're using SQLite)
- **Redis**: Say **NO**
- **Deploy now**: Say **NO** (we need to configure first)

### 2.5 Configure Fly.io for SQLite persistence

The `fly.toml` file will be created. We need to add volume configuration for SQLite persistence.

### 2.6 Create a persistent volume for SQLite

```bash
flyctl volumes create cricket_data --size 1
```

### 2.7 Set environment variables

```bash
flyctl secrets set NODE_ENV=production
flyctl secrets set PORT=4000
```

### 2.8 Deploy backend

```bash
flyctl deploy
```

### 2.9 Note your backend URL

After deployment, your backend will be available at:
```
https://your-app-name.fly.dev
```

For example: `https://cricketmela-api.fly.dev`

### 2.10 Test backend

```bash
curl https://your-app-name.fly.dev/api/health
```

---

## Part 3: Deploy Frontend to Cloudflare Pages

### 3.1 Login to Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create application** → **Connect to Git**

### 3.2 Connect GitHub Repository

1. Click **Connect GitHub**
2. Authorize Cloudflare to access your repositories
3. Select repository: `sponnapp/cricketmela`
4. Click **Begin setup**

### 3.3 Configure Build Settings

Set the following build configuration:

- **Project name**: `cricketmela` (or your choice)
- **Production branch**: `main`
- **Framework preset**: `Vite`
- **Build command**: `cd frontend && npm install && npm run build`
- **Build output directory**: `frontend/dist`
- **Root directory**: `/` (leave empty or use root)

### 3.4 Set Environment Variables

Add the following environment variable:

- **Variable name**: `VITE_API_URL`
- **Value**: `https://your-app-name.fly.dev` (your Fly.io backend URL)

For example: `https://cricketmela-api.fly.dev`

### 3.5 Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (usually 2-5 minutes)
3. Your site will be live at: `https://cricketmela.pages.dev`

---

## Part 4: Update Frontend API Configuration

### 4.1 Update frontend to use environment variable

The frontend needs to use the backend URL from environment variables instead of localhost.

Create/update the API configuration to use the Fly.io backend URL in production.

### 4.2 Redeploy if needed

After updating the code:
```bash
git add .
git commit -m "Update API URL for production"
git push origin main
```

Cloudflare Pages will automatically rebuild and deploy.

---

## Part 5: Custom Domain (Optional)

### 5.1 Frontend Custom Domain (Cloudflare Pages)

1. Go to your Cloudflare Pages project
2. Click **Custom domains**
3. Click **Set up a custom domain**
4. Enter your domain (e.g., `cricketmela.com`)
5. Follow DNS setup instructions

### 5.2 Backend Custom Domain (Fly.io)

1. Add a custom domain to your Fly.io app:
```bash
flyctl certs create api.cricketmela.com
```

2. Update your DNS with the provided values

---

## Part 6: Database Management

### 6.1 Access backend SSH

```bash
flyctl ssh console
```

### 6.2 View logs

```bash
# Backend logs
flyctl logs

# Tail logs in real-time
flyctl logs -f
```

### 6.3 Backup database

```bash
# SSH into the app
flyctl ssh console

# Inside the container, backup the database
sqlite3 data.db .dump > backup.sql
```

To download the backup:
```bash
flyctl ssh sftp get /app/data.db ./data.db.backup
```

### 6.4 Restore database

```bash
# Upload database file
flyctl ssh sftp shell

# Then use SFTP commands
put local-data.db /app/data.db
```

---

## Part 7: Environment-Specific Configuration

### 7.1 CORS Configuration

Make sure your backend allows requests from your Cloudflare Pages domain.

Update `backend/index.js` CORS settings to include your production domain:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://cricketmela.pages.dev',
  'https://your-custom-domain.com'
];
```

---

## Part 8: Monitoring & Maintenance

### 8.1 Monitor Backend

```bash
# View app status
flyctl status

# View metrics
flyctl metrics

# Scale if needed
flyctl scale count 2  # Run 2 instances
```

### 8.2 Monitor Frontend

1. Go to Cloudflare Pages dashboard
2. Check **Analytics** tab for traffic
3. Check **Deployments** for build history

### 8.3 Update Application

To deploy updates:

1. Push code to GitHub:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

2. Cloudflare Pages will auto-deploy frontend
3. For backend, deploy manually:
```bash
cd backend
flyctl deploy
```

---

## Troubleshooting

### Frontend Issues

1. **Build fails**: Check build logs in Cloudflare Pages dashboard
2. **API errors**: Verify `VITE_API_URL` environment variable is set correctly
3. **CORS errors**: Check backend CORS configuration

### Backend Issues

1. **App crashes**: Check logs with `flyctl logs`
2. **Database errors**: Ensure volume is mounted correctly
3. **Slow responses**: Consider scaling up: `flyctl scale vm shared-cpu-1x`

### Common Issues

1. **404 on refresh**: Cloudflare Pages needs SPA routing config
2. **API timeout**: Check Fly.io app is running: `flyctl status`
3. **Database lost**: Ensure volume is properly configured

---

## Cost Estimates (Free Tiers)

### Cloudflare Pages (Free)
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ 500 builds per month
- ✅ 1 build at a time

### Fly.io (Free)
- ✅ Up to 3 shared-cpu-1x VMs (256MB RAM)
- ✅ 3GB persistent volume storage
- ✅ 160GB outbound data transfer

**Total monthly cost**: $0 (within free tier limits)

---

## Security Recommendations

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS**: Both platforms provide free SSL certificates
3. **Database Backups**: Schedule regular backups of SQLite database
4. **Rate Limiting**: Consider adding rate limiting to backend API
5. **Authentication**: Ensure JWT secrets are strong and stored securely

---

## Next Steps

1. Set up automated database backups
2. Configure custom domains
3. Set up monitoring alerts
4. Implement CI/CD improvements
5. Add staging environment

---

## Support Resources

- **Fly.io Docs**: https://fly.io/docs/
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **GitHub Actions**: https://docs.github.com/en/actions (for advanced CI/CD)

---

## Quick Reference Commands

```bash
# Backend (Fly.io)
flyctl status                 # Check app status
flyctl logs                   # View logs
flyctl deploy                 # Deploy updates
flyctl ssh console            # SSH into app
flyctl volumes list           # List volumes

# Frontend
# Just push to GitHub - Cloudflare auto-deploys!

# Database backup
flyctl ssh sftp get /app/data.db ./backup-$(date +%Y%m%d).db
```

---

**Deployment Checklist:**

- [ ] Code pushed to GitHub
- [ ] Fly.io account created
- [ ] Fly CLI installed
- [ ] Backend deployed to Fly.io
- [ ] Persistent volume created for SQLite
- [ ] Backend URL noted
- [ ] Cloudflare Pages connected to GitHub
- [ ] Environment variables set in Cloudflare Pages
- [ ] Frontend deployed to Cloudflare Pages
- [ ] CORS configured for production domain
- [ ] Both frontend and backend tested
- [ ] Database backup strategy in place

---

*Last updated: February 22, 2026*

