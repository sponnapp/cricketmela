Tech choices for IPL T20 Betting

Recommended starter (fullstack) - good balance of control and speed:
- Frontend: React + Vite (fast dev, small build)
- Backend: Node.js + Express
- DB: Postgres for production; SQLite for local/dev and small deployments
- Payments: Stripe (Checkout + webhook)
- Hosting: Vercel/Netlify for frontend, Render/Heroku/Cloud run for backend; Postgres via Supabase or Heroku Postgres

Alternative: Headless platform
- Frontend: Next.js or static site
- E‑commerce: Shopify / BigCommerce / Snipcart
- Pros: less infra; cons: monthly costs and vendor constraints

Simple static site (marketing-only)
- Plain HTML/CSS/JS or static-generator (Hugo/Eleventy)
- Use Stripe Checkout or Snipcart for cart/checkout

Local dev recommendations
- Use SQLite locally (database file checked in .gitignore if you want persistence per machine)
- Use environment variables stored in .env (never commit secrets)
- Use GitHub Actions + Dependabot + npm audit as automated checks

Performance & security recommendations
- Use a CDN for images and assets
- Serve pre-compressed assets (brotli/gzip)
- Enforce dependency scanning and a policy to block high/critical CVEs on PRs
