# Voice AI Agent SaaS Backend (Twilio + OpenAI + Shopify/WooCommerce + Lemon Squeezy Billing)

Production-ready Node.js backend for a multilingual Voice AI SaaS with ecommerce order automation and a full credit-based subscription billing system.

## What is included

### Voice AI platform
- Inbound Twilio voice webhook handling
- Outbound Twilio call trigger endpoint
- Arabic (Egyptian + MSA) and English conversation flow
- LLM reasoning with OpenAI JSON schema outputs
- Product Q&A, order status lookup, and voice-driven order creation
- Shopify + WooCommerce order push

### Billing platform (NEW)
- Lemon Squeezy integration for subscription checkout and credits checkout
- Webhook handling for:
  - `subscription_created`
  - `payment_succeeded`
  - `payment_failed`
- Credit-based usage ledger (1 credit per AI response)
- Monthly plans:
  - Starter: 10,000 credits / $49
  - Professional: 50,000 credits / $129
  - Enterprise: 200,000 credits / $399
- Admin billing endpoints to:
  - view subscriptions/users
  - view usage
  - view failed payments
  - manually add/remove credits
- Email notification hook (console fallback)
- Multi-tenant-ready data model (`tenantId` support)

## Folder structure

```text
.
├── billing/                # Lemon client, plans, billing service, data store
├── webhooks/               # Lemon webhook routes and signature verifier
├── notifications/          # Email notification abstraction
├── public/                 # Billing dashboard HTML template
├── voice-agent/            # Voice flow + prompts + session/language helpers
├── twilio/                 # Twilio routes and TwiML
├── llm/                    # OpenAI integration
├── shopify/                # Shopify adapter
├── woocommerce/            # WooCommerce adapter
├── orders/                 # Order orchestration + logs
├── dashboard/              # Health and voice dashboard endpoints
├── config/                 # Env + HTTP utility
├── test/                   # Subscription/credits and language/flow tests
├── index.js                # App entrypoint
└── .env.example
```

## Quick start

```bash
npm install
cp .env.example .env
npm start
```

Server: `http://localhost:3000`

## Billing setup (Lemon Squeezy)

1. Create Lemon Squeezy Store and product variants:
   - Starter monthly variant
   - Professional monthly variant
   - Enterprise monthly variant
   - Extra credits one-time variant
2. Set env:
   - `LEMON_API_KEY`
   - `LEMON_WEBHOOK_SECRET`
   - `LEMON_STORE_ID`
   - `LEMON_PLAN_VARIANT_MAP_JSON`
   - `LEMON_CREDITS_VARIANT_ID`
3. In Lemon Squeezy webhook settings, configure these endpoints:
   - `POST https://YOUR_DOMAIN/webhooks/subscription_created`
   - `POST https://YOUR_DOMAIN/webhooks/payment_succeeded`
   - `POST https://YOUR_DOMAIN/webhooks/payment_failed`
4. Ensure your webhook signature header is sent (`X-Signature` or `X-LemonSqueezy-Signature`).

## Billing API reference

### Plans and checkout
- `GET /billing/plans`
- `POST /billing/checkout/subscription`
  - body: `{ userId, userEmail, planCode, tenantId? }`
- `POST /billing/checkout/credits`
  - body: `{ userId, userEmail, tenantId? }`

### Credit usage
- `POST /billing/usage/consume`
  - body: `{ userId, tenantId?, source?, credits? }`
  - consumes 1 credit by default

### User balance
- `GET /billing/users/:userId/balance?tenantId=default`

### Admin
- `GET /billing/admin?month=YYYY-MM&tenantId=...`
- `POST /billing/admin/credits/adjust`
  - body: `{ userId, tenantId?, delta, reason? }`

### Webhooks
- `POST /webhooks/subscription_created`
- `POST /webhooks/payment_succeeded`
- `POST /webhooks/payment_failed`

## Sample dashboard template
Open:
- `GET /public/billing-dashboard.html`

This template pulls `GET /billing/admin` and displays users, balances, and failed payments.

## Credit consumption model
- Every AI reply (voice or chat) should call `POST /billing/usage/consume`.
- 1 reply = 1 credit.
- If balance is exhausted, user is moved to `credit_exhausted` and requests should be blocked until top-up/payment.

## Twilio setup
- Inbound: `POST /twilio/voice/incoming`
- Speech turns: `POST /twilio/voice/handle`
- Outbound trigger: `POST /twilio/voice/outbound/call`

## Deployment

### Docker
```bash
docker build -t voice-ai-saas .
docker run --env-file .env -p 3000:3000 voice-ai-saas
```

### Notes
- Current data store is in-memory for simplicity. Replace `billing/store.js` with Postgres/Redis for persistent production deployments.
- Webhook verification uses HMAC SHA256 with `LEMON_WEBHOOK_SECRET`.

## Tests

```bash
npm test
npm run lint
```

Includes tests for:
- Voice flow behavior
- Language resolution
- Billing subscription/payment/credit lifecycle
