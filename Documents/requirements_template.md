Requirements template for IPL T20 Betting website

1) Stakeholder & business questions
- Primary audience and countries of operation
- Goals: revenue, brand awareness, or promotions?  
- Payment providers and preferred checkout flow (Stripe, PayPal, other)
- Shipping carriers and tax jurisdictions
- Inventory management needed? (real-time or manual)
- GDPR / privacy / analytics requirements

2) Functional requirements (MVP)
- Public pages: home, team collection pages, product detail, about, contact
- Product catalog with filters (team, size, color)
- Cart and checkout (Stripe Checkout recommended)
- Admin panel or CSV import for product management
- Order confirmation emails

3) Non-functional requirements
- Responsive design and baseline accessibility (WCAG AA)
- Local dev and production builds
- Performance target: TTFB < 500ms for API; pages < 2s
- Security: PCI scope minimization (use Stripe), dependency scanning, HTTPS in production

4) Data model (minimal)
- Product { id, name, description, price, colors[], sizes[], sku, imageUrl }
- Order { id, items[], total, status, customer, shipping }
- User { id, email, hashedPassword, roles }

5) Integrations
- Payments: Stripe (recommended) — server webhook handling
- Shipping: carrier APIs or manual rates
- Email: SendGrid/Postmark for transactional emails
- Analytics: Google Analytics (GA4) or Plausible

6) Acceptance criteria
- Can view product catalog and detail pages
- Add to cart and complete a test Stripe payment (sandbox)
- Admin or migration can add products successfully
- CI runs lint/test and dependency scan on PRs

7) MVP vs roadmap
- MVP: catalog + cart + Stripe checkout, admin via CSV or simple UI
- Next: user accounts, saved addresses, coupons, multi-currency, search & recommendations

8) Edge cases
- Zero inventory, cart quantity changes, partial order failures at checkout, payment webhooks failing

9) Testing plan
- Unit tests for server endpoints and core helpers
- Integration tests for checkout flow (Stripe test keys)
- Frontend e2e smoke tests (Playwright)
