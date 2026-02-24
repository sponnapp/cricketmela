
# Cloudflare Pages - API Proxy Configuration

This file ensures API calls from the frontend are routed to the backend on Fly.io.

## Setup in Cloudflare Pages Dashboard

1. Go to your Cloudflare Pages project: https://dash.cloudflare.com/
2. Select "cricketmela" project
3. Go to Settings → Functions
4. Add environment variable:
   - Name: `API_URL`
   - Value: `https://cricketmela-api.fly.dev`

## API Routing

All requests to `/api/*` will be proxied to the Fly.io backend.

The `_redirects` file handles this automatically.

