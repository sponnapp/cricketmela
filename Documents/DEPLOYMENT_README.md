# Deployment Files Overview

This directory contains everything you need to deploy Cricket Mela to production.

## 📁 File Structure

```
/
├── QUICK_DEPLOY.md           # Start here! Quick deployment guide
├── DEPLOYMENT_GUIDE.md        # Detailed step-by-step guide
├── DEPLOYMENT_CHECKLIST.md    # Comprehensive checklist
├── deploy-backend.sh          # Automated backend deployment script
├── backup-database.sh         # Database backup script
│
├── backend/
│   ├── fly.toml              # Fly.io configuration
│   ├── Dockerfile            # Container configuration
│   ├── .dockerignore         # Docker ignore rules
│   └── .env.example          # Environment variables template
│
└── frontend/
    ├── vite.config.js        # Already configured for production
    ├── public/_redirects     # Cloudflare Pages SPA routing
    ├── functions/            # Cloudflare Pages functions
    └── .env.example          # Environment variables template
```

## 🚀 Quick Start

### 1. Read This First
Start with **QUICK_DEPLOY.md** - it has the fastest path to deployment.

### 2. Deploy Backend (10 minutes)
```bash
./deploy-backend.sh
```

### 3. Deploy Frontend (10 minutes)
- Go to Cloudflare Pages dashboard
- Connect GitHub repository
- Configure build settings
- Deploy!

## 📚 Documentation

### For Quick Deployment
👉 **QUICK_DEPLOY.md** - Fast track deployment (30 minutes total)

### For Detailed Instructions
👉 **DEPLOYMENT_GUIDE.md** - Complete guide with troubleshooting

### For Systematic Deployment
👉 **DEPLOYMENT_CHECKLIST.md** - Don't miss anything!

## 🛠 Configuration Files

### Backend (Fly.io)

**fly.toml**
- Fly.io app configuration
- Already configured for SQLite persistence
- Includes health checks
- Update `app` name to your choice

**Dockerfile**
- Node.js 18 Alpine image
- Production-ready configuration
- Minimal size (~150MB)

**.env.example**
- Template for environment variables
- Copy to `.env` for local development

### Frontend (Cloudflare Pages)

**vite.config.js**
- Already configured for tunneling support
- Allows Cloudflare domains
- Proxy configured for local development

**public/_redirects**
- Handles SPA routing
- All routes go to index.html

**functions/_middleware.js**
- Cloudflare Pages function
- Handles client-side routing
- Preserves static assets

**.env.example**
- Template for environment variables
- Set VITE_API_URL in Cloudflare Pages

## 🔧 Scripts

### deploy-backend.sh
Automated backend deployment to Fly.io:
```bash
./deploy-backend.sh
```

Features:
- Checks for Fly CLI installation
- Handles authentication
- Creates app and volume if needed
- Deploys and shows URL

### backup-database.sh
Backs up SQLite database from Fly.io:
```bash
./backup-database.sh
```

Features:
- Downloads database from Fly.io
- Saves with timestamp
- Stores in `./backups/` directory
- Shows backup size and list

## 🌐 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
           ┌───────────▼──────────────┐
           │  Cloudflare Pages        │
           │  (Frontend - React)      │
           │  • Static hosting        │
           │  • Auto SSL              │
           │  • CDN                   │
           │  • SPA routing           │
           └───────────┬──────────────┘
                       │
                       │ API Calls (HTTPS)
                       │
           ┌───────────▼──────────────┐
           │  Fly.io                  │
           │  (Backend - Node.js)     │
           │  • Express API           │
           │  • JWT Auth              │
           │  • Business Logic        │
           └───────────┬──────────────┘
                       │
                       │
           ┌───────────▼──────────────┐
           │  SQLite Database         │
           │  (Persistent Volume)     │
           │  • 1GB volume            │
           │  • Auto-backup           │
           └──────────────────────────┘
```

## 💰 Cost Estimate

### Free Tier (Recommended for Start)

**Cloudflare Pages:**
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ 500 builds/month
- ✅ Free SSL
- **Cost: $0/month**

**Fly.io:**
- ✅ 3 shared VMs (256MB RAM)
- ✅ 3GB persistent storage
- ✅ 160GB outbound transfer
- **Cost: $0/month**

**Total: $0/month** for typical usage!

### If You Exceed Free Tier

**Cloudflare Pages:**
- Still free (unlimited)

**Fly.io:**
- Additional RAM: ~$2/GB/month
- Additional storage: ~$0.15/GB/month
- Additional bandwidth: ~$0.02/GB

**Estimated: $5-15/month** for moderate traffic

## 🔐 Security Best Practices

1. **Never commit:**
   - `.env` files
   - Database files
   - Secrets or passwords
   - API keys

2. **Always use:**
   - Environment variables for secrets
   - HTTPS (both platforms provide free SSL)
   - Strong JWT secrets
   - Case-insensitive username login

3. **Enable:**
   - CORS restrictions (already configured)
   - Rate limiting (consider for production)
   - Regular backups
   - Monitoring

## 📊 Monitoring

### Backend (Fly.io)
```bash
# View logs in real-time
flyctl logs -f

# Check app status
flyctl status

# View metrics
flyctl metrics
```

### Frontend (Cloudflare Pages)
- Dashboard → Your project → Analytics
- View traffic, requests, bandwidth
- Check deployment history

## 🆘 Troubleshooting

### Common Issues

**"CORS error"**
- Update backend CORS settings
- Add your Cloudflare domain to allowedOrigins

**"Failed to fetch"**
- Check VITE_API_URL in Cloudflare Pages
- Verify backend is running: `flyctl status`

**"Database not found"**
- Verify volume is created: `flyctl volumes list`
- Check mount path in fly.toml

**"Build failed"**
- Check build command in Cloudflare Pages
- Ensure it includes `cd frontend`
- Review build logs for errors

### Get Help

- 📖 Full guide: **DEPLOYMENT_GUIDE.md**
- ✅ Checklist: **DEPLOYMENT_CHECKLIST.md**
- 💬 Fly.io community: https://community.fly.io/
- 💬 Cloudflare community: https://community.cloudflare.com/

## 🎯 Next Steps After Deployment

1. **Test everything** - Use checklist
2. **Set up monitoring** - Watch for errors
3. **Create backups** - Run backup script
4. **Document credentials** - Store securely
5. **Share with users** - Send them the URL
6. **Plan updates** - Git push auto-deploys frontend!

## 📝 Update Process

### To update frontend:
```bash
git add .
git commit -m "Update frontend"
git push origin main
# Cloudflare auto-deploys!
```

### To update backend:
```bash
cd backend
# Make changes
git add .
git commit -m "Update backend"
git push origin main
flyctl deploy
```

## 🔄 Rollback Process

### Frontend:
- Cloudflare Pages → Deployments
- Select previous deployment
- Click "Rollback"

### Backend:
```bash
flyctl releases list
flyctl releases rollback <version>
```

---

## 🎉 Ready to Deploy?

1. Start with **QUICK_DEPLOY.md**
2. Follow the checklist in **DEPLOYMENT_CHECKLIST.md**
3. Refer to **DEPLOYMENT_GUIDE.md** for details

**Good luck with your deployment!** 🚀

---

*Last updated: February 22, 2026*

