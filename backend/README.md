# GadgetHub Backend

REST API built with TypeScript, Node.js, Express, PostgreSQL and Prisma.

## Run locally

1. Copy `.env.example` to `.env` and change `JWT_SECRET`.
2. Start PostgreSQL: `docker compose up -d postgres`. The container is exposed on host port `5433` to avoid conflicts with locally installed PostgreSQL services.
3. Install and generate: `npm install && npm run prisma:generate`.
4. Create the database schema: `npm run prisma:migrate -- --name initial`.
5. Start the API: `npm run dev`.

Base URL: `http://localhost:4000/api/v1`. The implemented foundation includes authentication/RBAC, catalogue search and filters, inventory-backed variants, persistent carts, atomic checkout and stock deduction, orders, payments/delivery records, profiles, addresses and wishlists. The Prisma schema also covers reviews, trade-ins, warranty, repairs, support, returns/refunds, loyalty, notifications, alerts, content, settings and audit logs for subsequent API modules.

To bootstrap the first administrator, set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters, then run `npm run db:seed`. This creates no sample products, placeholder content, or default credentials. See `API.md` for the route map.

Production integrations are configured exclusively through environment variables documented in `.env.example`. `/api/v1/providers/health` reports readiness to a super administrator. S3-compatible uploads use short-lived signed URLs; SMTP provides email, Twilio provides SMS/WhatsApp, Web Push uses VAPID, and the shopping assistant uses the OpenAI Responses API grounded in live catalogue data. Run `npm run backup`, `k6 run tests/load.k6.js`, and the OWASP ZAP automation file in `tests/security.zap.yaml` as part of deployment validation.

Commerce, Paynow, wishlist, order persistence, loyalty earning, and reward redemption are documented in [COMMERCE_AND_LOYALTY.md](./COMMERCE_AND_LOYALTY.md).

Temporary production domain: `https://api.tinashenyenyesatech.ac.zw`. The `api` record currently points to `104.160.240.35`; deploy or reverse-proxy GadgetHub on that server before starting Caddy. The root and `www` origins are allowed for the customer frontend.

## Verification

Run `npm run build` and `npm test`.
