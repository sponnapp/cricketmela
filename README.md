IPL T20 Betting - Local Dev

This repository is a minimal starter for an IPL-themed betting e-commerce site.

Structure:
- backend/: Express API serving product data
- frontend/: Vite + React single-page app

User personas (for local dev)
- admin: full control (role = admin). Use header `x-user: admin` to authenticate as admin.
- senthil: limited control (role = picker). Use header `x-user: senthil` to authenticate as senthil.

Winner selection
- GET /api/winner -> returns current winner
- POST /api/winner -> set winner (allowed for admin and picker)
  - body: { "winner": "Team Name" }
  - requires header `x-user: admin` or `x-user: senthil`

Admin-only endpoints
- POST /api/admin/products -> create a product (admin only)
  - body: { name, price, colors, sizes, image }
  - requires header `x-user: admin`

Quick start (macOS, zsh):

1. Install backend deps:
   cd backend
   npm install

2. Initialize database and seed:
   npm run migrate

3. Start backend (in one terminal):
   npm start

4. Install frontend deps and start frontend (another terminal):
   cd ../frontend
   npm install
   npm run dev

Frontend will run on http://localhost:5173 and proxy/fetch data from the backend at http://localhost:4000.

Next steps: customize catalog, add cart/checkout, integrate Stripe, add CI and security scans.
