# SalonBook Server

REST API for **SalonBook**, a salon appointment booking platform. Customers browse
services, request appointments and pay through Stripe. The admin manages services,
appointments, customers and transactions.

## Important Features
- JWT verification (Better Auth JWKS, `jose`) with server-side role and blocked-user checks
- Public services API with search, category filter, price sorting and pagination
- Admin service management: create, update, delete, activate/deactivate
- ImgBB image upload through the server (the API key is never exposed)
- Customer appointments: create, list, view, cancel pending requests
- Duplicate time-slot protection with a unique partial index
- Admin appointments: confirm pending, cancel pending or confirmed
- User management: block and unblock customers, profile update with a field whitelist
- Stripe Checkout; payment status is updated **only by a verified webhook**
- Read-only admin transactions
- Dashboard statistics for admin and customer

## Technology Stack
Node.js, Express.js, MongoDB (native driver), jose (JWT), Stripe, ImgBB, Multer

## Installation
```bash
git clone <server-repo-link>
cd salonbook-server
npm install
cp .env.example .env   # then fill in your values
```

## How to Run Locally
```bash
npm run dev            # development with nodemon
npm start              # production
npm run seed           # optional: insert 14 sample services
```
Server runs at http://localhost:5000

### Test Stripe webhooks locally
```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to localhost:5000/api/webhooks/stripe
```
Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

## Required Environment Variables (names only)
`PORT`, `NODE_ENV`, `CLIENT_URL`, `SALON_TIMEZONE`, `MONGODB_URI`, `DB_NAME`,
`AUTH_JWKS_URL`, `AUTH_ISSUER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PAYMENT_CURRENCY`, `IMGBB_API_KEY`

## API Overview
| Area | Routes |
|---|---|
| Public | `GET /api/services`, `/api/services/categories`, `/api/services/:id` |
| Auth user | `GET/PUT /api/me`, `POST /api/upload/image` |
| Customer | `/api/appointments/*`, `/api/payments/*`, `GET /api/dashboard/customer` |
| Admin | `/api/admin/services`, `/api/admin/appointments`, `/api/admin/users`, `/api/admin/transactions`, `GET /api/dashboard/admin` |
| Stripe | `POST /api/webhooks/stripe` (signature verified) |

## Deployment Guideline (Vercel)
1. Import this repository into Vercel as a **Node.js** project (no framework preset needed).
2. Set the environment variables listed above. In production, `CLIENT_URL`,
   `AUTH_JWKS_URL` and `AUTH_ISSUER` must point to the deployed client:
   `https://salonbook-client-rho.vercel.app` (JWKS: `.../api/auth/jwks`).
3. Register `https://<your-server-domain>/api/webhooks/stripe` in Stripe and set
   `STRIPE_WEBHOOK_SECRET` to the printed signing secret.
4. Deploy, then set `NEXT_PUBLIC_API_URL` in the client project to this server's URL
   and redeploy the client.

## Live Website Link
- Live site: https://salonbook-client-rho.vercel.app/

## Repository Links
- Server repo: https://github.com/Abdullah-al-Numan-dev/salonbook-server
- Client repo: https://github.com/Abdullah-al-Numan-dev/salonbook-client