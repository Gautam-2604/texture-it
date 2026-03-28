# Textura

Generate seamless, tileable textures from a text description. Type what you need — brick wall, mossy stone, fabric weave — and get a production-ready 1024×1024 PNG in seconds.

## What it does

- **Text-to-texture generation** powered by Flux (via Replicate)
- **Seamless & tileable** — every output is designed to tile without visible seams
- **Instant gallery** — all your generated textures are saved and accessible from your account
- **Secure downloads** — textures are stored in the cloud and served through authenticated endpoints
- **Free tier + Pro plan** — free users get a limited number of generations; Pro users get unlimited access for $3/month

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS v4 |
| AI model | `black-forest-labs/flux-schnell` via Replicate |
| Auth | Clerk |
| Database | Supabase (Postgres) |
| File storage | Vercel Blob |
| Payments | Stripe Subscriptions |
| Rate limiting | Upstash Redis |

## Getting started

### Prerequisites

Accounts on: [Clerk](https://clerk.com), [Supabase](https://supabase.com), [Replicate](https://replicate.com), [Vercel](https://vercel.com), [Upstash](https://upstash.com), [Stripe](https://stripe.com)

### 1. Clone and install

```bash
git clone <repo-url>
cd textura
npm install
cp .env.example .env.local
```

### 2. Fill in environment variables

Open `.env.local` and add keys for each service:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `REPLICATE_API_TOKEN` | replicate.com → Account → API Tokens |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard → Storage → Blob |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash console |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API Keys |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Stripe dashboard → Product catalog |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks |

### 3. Set up the database

In your Supabase SQL editor, run the contents of `supabase-schema.sql`.

### 4. Configure Clerk redirect paths

In Clerk dashboard → Paths:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in/sign-up: `/app`

### 5. Set up Stripe webhook

Create a webhook endpoint pointing to `https://your-domain.com/api/webhooks/stripe` and subscribe to:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

For local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6. Run locally

```bash
npm run dev
```

### 7. Deploy

Push to GitHub, import into Vercel, and add all environment variables in the Vercel project settings. The `vercel.json` config sets a 60-second timeout on the generation endpoint automatically.

## License

MIT
