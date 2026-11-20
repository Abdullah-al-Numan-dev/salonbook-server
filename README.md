# SalonBook Server

REST API for the SalonBook salon appointment booking platform.

## Features (in progress)
- JWT verification and role-based access (admin / customer)
- Services management with search, filter and sort
- Appointment booking, confirmation and cancellation
- Stripe Checkout with verified webhook
- Image upload via ImgBB

## Tech Stack
Node.js, Express.js, MongoDB, jose (JWT), Stripe, ImgBB

## Installation
```bash
git clone <server-repo-link>
cd salonbook-server
npm install
cp .env.example .env   # then fill in your values
```

## Run Locally
```bash
npm run dev
```
Server runs at http://localhost:5000

## Environment Variables (names only)
PORT, NODE_ENV, CLIENT_URL, MONGODB_URI, DB_NAME, AUTH_JWKS_URL,
AUTH_ISSUER, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, IMGBB_API_KEY

## Links
- Live API: _add later_
- Client repo: _add later_
- Server repo: _add later_