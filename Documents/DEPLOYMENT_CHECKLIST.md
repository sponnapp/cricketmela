# Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment

### Code Preparation
- [ ] All features tested locally
- [ ] Database has test data
- [ ] No console.log statements (or minimal)
- [ ] All dependencies in package.json
- [ ] .gitignore updated
- [ ] .env files not committed
- [ ] Code committed and pushed to GitHub

### Accounts Setup
- [ ] GitHub account ready
- [ ] Cloudflare account created
- [ ] Fly.io account created
- [ ] Credit card added (if needed for Fly.io)

### Tools Installation
- [ ] Git installed
- [ ] Node.js installed (v18+)
- [ ] Fly CLI installed (`brew install flyctl`)
- [ ] Logged into Fly CLI (`flyctl auth login`)

## Backend Deployment (Fly.io)

### Initial Setup
- [ ] Navigate to backend directory
- [ ] Run `flyctl launch` (don't deploy yet)
- [ ] App name chosen and noted: ________________
- [ ] Region selected: ________________
- [ ] fly.toml file created
- [ ] Dockerfile exists
- [ ] .dockerignore exists

### Volume Setup
- [ ] Persistent volume created: `flyctl volumes create cricket_data --size 1`
- [ ] Volume listed in `flyctl volumes list`
- [ ] fly.toml has [mounts] section configured

### Environment Variables
- [ ] NODE_ENV=production set: `flyctl secrets set NODE_ENV=production`
- [ ] PORT=4000 in fly.toml

### Deployment
- [ ] Run `flyctl deploy`
- [ ] Deployment successful
- [ ] App status checked: `flyctl status`
- [ ] Health check works: `curl https://your-app.fly.dev/api/health`
- [ ] Backend URL noted: ________________

### Database Initialization
- [ ] SSH into app: `flyctl ssh console`
- [ ] Database file exists at /app/data/data.db
- [ ] Test API endpoints work
- [ ] Create admin user if needed

## Frontend Deployment (Cloudflare Pages)

### Build Configuration
- [ ] Navigate to Cloudflare Dashboard
- [ ] Workers & Pages → Pages → Create application
- [ ] GitHub authorized
- [ ] Repository selected: `sponnapp/cricketmela`

### Build Settings
- [ ] Framework preset: Vite
- [ ] Build command: `cd frontend && npm install && npm run build`
- [ ] Build output directory: `frontend/dist`
- [ ] Root directory: `/` (or empty)

### Environment Variables
- [ ] VITE_API_URL set to: ________________ (Fly.io URL)
- [ ] Variable saved in Cloudflare Pages settings

### Deployment
- [ ] Click "Save and Deploy"
- [ ] Build logs checked for errors
- [ ] Deployment successful
- [ ] Site URL noted: ________________
- [ ] Site accessible in browser

## Post-Deployment Testing

### Backend Tests
- [ ] Health endpoint: `curl https://your-app.fly.dev/api/health`
- [ ] Seasons endpoint: `curl https://your-app.fly.dev/api/seasons`
- [ ] Backend logs checked: `flyctl logs`
- [ ] No errors in logs

### Frontend Tests
- [ ] Home page loads
- [ ] Login page accessible
- [ ] Can log in with test account
- [ ] Navigation works
- [ ] Season cards display
- [ ] Cricket icons show properly

### Integration Tests
- [ ] Frontend connects to backend
- [ ] Login works end-to-end
- [ ] Matches load from database
- [ ] Voting works
- [ ] Admin panel accessible
- [ ] Standings calculate correctly
- [ ] No CORS errors in browser console

### Browser Testing
- [ ] Tested on Chrome
- [ ] Tested on Safari
- [ ] Tested on mobile device
- [ ] Responsive design works

## Configuration Updates

### CORS Configuration
- [ ] Backend CORS includes production domain
- [ ] Cloudflare Pages domain added to allowedOrigins
- [ ] Custom domain added (if applicable)
- [ ] CORS errors resolved

### Security
- [ ] JWT secret is secure
- [ ] No passwords in code
- [ ] .env files not committed
- [ ] API endpoints properly secured
- [ ] Admin routes protected

## Documentation

### URLs Documented
- [ ] Backend URL: ________________
- [ ] Frontend URL: ________________
- [ ] Admin login: ________________
- [ ] Test user login: ________________

### Access Information
- [ ] Fly.io dashboard: https://fly.io/dashboard
- [ ] Cloudflare Pages: https://dash.cloudflare.com/
- [ ] GitHub repo: https://github.com/sponnapp/cricketmela

### Commands Documented
- [ ] Deploy backend: `./deploy-backend.sh`
- [ ] Backup database: `./backup-database.sh`
- [ ] View logs: `flyctl logs -f`
- [ ] SSH to backend: `flyctl ssh console`

## Monitoring Setup

### Backend Monitoring
- [ ] Fly.io monitoring enabled
- [ ] Log aggregation configured
- [ ] Health check configured in fly.toml
- [ ] Alerts set up (optional)

### Frontend Monitoring
- [ ] Cloudflare Analytics enabled
- [ ] Error tracking considered
- [ ] Performance monitoring reviewed

## Backup & Recovery

### Database Backups
- [ ] Backup script tested: `./backup-database.sh`
- [ ] First backup created
- [ ] Backup location noted: `./backups/`
- [ ] Backup schedule planned
- [ ] Recovery procedure documented

### Code Backups
- [ ] Code in GitHub
- [ ] All changes committed
- [ ] Tags/releases created (optional)

## Optional Enhancements

### Custom Domains
- [ ] Custom domain purchased
- [ ] DNS configured for frontend
- [ ] DNS configured for backend
- [ ] SSL certificates issued
- [ ] Both domains working

### CI/CD
- [ ] GitHub Actions configured (optional)
- [ ] Auto-deploy on push (frontend is auto)
- [ ] Testing pipeline (optional)

### Performance
- [ ] CDN enabled (Cloudflare provides this)
- [ ] Image optimization
- [ ] Code minification (Vite handles this)
- [ ] Compression enabled

### Scaling
- [ ] Monitor usage
- [ ] Scale plan documented
- [ ] Cost monitoring enabled
- [ ] Usage alerts configured

## Launch Preparation

### Final Checks
- [ ] All features working
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] Documentation complete

### User Communication
- [ ] Share frontend URL with users
- [ ] Provide login instructions
- [ ] Share admin credentials securely
- [ ] Announce launch

### Support Plan
- [ ] How to report issues documented
- [ ] Monitoring schedule set
- [ ] Update procedure documented
- [ ] Rollback plan ready

## Post-Launch

### Week 1
- [ ] Monitor logs daily
- [ ] Check error rates
- [ ] Gather user feedback
- [ ] Fix urgent issues
- [ ] Database backed up

### Month 1
- [ ] Review costs
- [ ] Optimize if needed
- [ ] Plan improvements
- [ ] Update documentation
- [ ] Regular backups scheduled

## Rollback Plan

If something goes wrong:

### Backend Rollback
```bash
# Revert to previous release
flyctl releases list
flyctl releases rollback <version>
```

### Frontend Rollback
1. Go to Cloudflare Pages dashboard
2. Deployments tab
3. Click on previous successful deployment
4. Click "Rollback to this deployment"

### Database Rollback
```bash
# Restore from backup
flyctl ssh sftp shell
put backups/backup.db /app/data/data.db
exit
flyctl restart
```

---

## Notes

Date deployed: ________________
Deployed by: ________________
Version: ________________

Issues encountered:
- 
- 
- 

Resolutions:
- 
- 
- 

---

**Status: Ready to Deploy** ✅

Good luck with your deployment! 🚀

