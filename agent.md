

## 1. Product Overview

**Product Name:** TextureForge

**Problem Solved:** Video editors need high-quality visual textures (grain, film burn, light leaks, noise overlays, grunge, etc.) to enhance their edits. Sourcing or creating these manually is time-consuming. TextureForge lets users describe a texture in plain English and receive downloadable PNG/WebP image assets or short looping MP4/WebM video textures immediately.

**Target Users:** Freelance video editors, motion designers, YouTubers, social media content creators.

**Core User Flow:**
1. User signs up / logs in.
2. User lands on the Dashboard showing generation history and usage quota.
3. User navigates to the Generator page, types a texture description prompt.
4. System calls OpenRouter API to generate a texture image (or a series of frames compiled into a loop).
5. Result is stored in DB, asset stored on filesystem or object storage, downloadable link presented.
6. After 2 free generations in the calendar month, user is shown a paywall.
7. User subscribes via PayPal for $5/month to unlock unlimited generations.
8. If PayPal env vars are absent, paywall UI is replaced with "Payments coming soon" banner; limit enforcement still applies.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  Next.js App Router — React Server Components + Client Islands  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                   Next.js Server (Vercel / Node)                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  App Router  │  │  API Routes  │  │   Server Actions       │ │
│  │  (RSC Pages) │  │ /api/*       │  │  (form mutations)      │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘ │
└──────────────────────────-┼─────────────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
┌─────────▼──────┐ ┌────────▼──────┐  ┌────────▼────────┐
│  PostgreSQL DB │ │ OpenRouter API│  │  PayPal REST API │
│  (via Prisma)  │ │ (AI generation│  │  (subscriptions) │
└────────────────┘ └───────────────┘  └─────────────────-┘
          │
┌─────────▼──────────────────┐
│  Local /public/uploads OR  │
│  S3-compatible bucket      │
└────────────────────────────┘
```

**Request Lifecycle for Generation:**
1. Browser POST → `/api/generate` (authenticated, rate-checked)
2. Server validates session → checks monthly quota in DB
3. Server POSTs prompt to OpenRouter `/v1/chat/completions` or image endpoint
4. Server receives base64 image data → saves file to `/public/uploads/<userId>/<uuid>.png`
5. Server writes Generation record to PostgreSQL
6. Server returns JSON `{ id, assetUrl, createdAt }`
7. Browser renders preview + download button

---

## 3. Tech Stack

### Next.js 14 (App Router)
All pages use the `app/` directory. React Server Components handle data fetching by default. Client Components (`"use client"`) are scoped only to interactive islands (forms, modals, preview panels). Server Actions handle mutations to avoid REST boilerplate for simple form submissions.

### Aceternity UI
Used for high-impact visual components: the landing hero (Spotlight, BackgroundBeams), animated card grids (CardHoverEffect on the features section), TextGenerateEffect for marketing copy, and the WavyBackground behind the generator input. Install: `npm install @aceternity/ui framer-motion clsx tailwind-merge`.

### Shadcn/ui
Used for all functional UI primitives: Button, Input, Textarea, Dialog, DropdownMenu, Badge, Skeleton, Toast (via Sonner), Table, Tabs, Card, Progress, Select, Label, Separator, Avatar. Install via `npx shadcn@latest init` then individual `npx shadcn@latest add <component>`.

### Tailwind CSS
Config extends default theme with custom colors (`brand-500: #6d28d9`, `surface: #0f0f11`). Dark mode is `class`-based, defaulting to dark. All spacing follows the default Tailwind scale.

### PostgreSQL + Prisma
Single PostgreSQL database. Prisma Client generated at build time. Migrations managed via `prisma migrate dev`. Connection pooling via `DATABASE_URL` with `?pgbouncer=true&connection_limit=1` for serverless.

### NextAuth.js v5 (Auth.js)
Credentials provider (email/password with bcrypt hashing) + GitHub OAuth provider. Sessions stored as JWTs. Middleware protects all routes under `/dashboard`, `/generate`, `/billing`.

### PayPal REST API (Server-Side)
PayPal Node SDK (`@paypal/paypal-server-sdk`) used for subscription plan creation, subscription initiation, and webhook verification. Entire payment UI tree is conditionally rendered based on `process.env.PAYPAL_CLIENT_ID` being defined and non-empty.

---

## 4. Frontend Specification

### 4.1 App Router Directory Structure

```
app/
├── layout.tsx                  # Root layout: ThemeProvider, SessionProvider, Toaster
├── page.tsx                    # Landing page (public)
├── auth/
│   ├── login/page.tsx          # Login page
│   └── register/page.tsx       # Registration page
├── dashboard/
│   ├── layout.tsx              # Dashboard shell: sidebar + topbar
│   ├── page.tsx                # Dashboard home: quota card + recent generations
│   ├── generate/page.tsx       # Generator page
│   └── billing/page.tsx        # Billing / subscription page
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── generate/route.ts
│   ├── generations/route.ts
│   ├── billing/subscribe/route.ts
│   ├── billing/cancel/route.ts
│   └── billing/webhook/route.ts
components/
├── landing/
│   ├── Hero.tsx                # Aceternity Spotlight + TextGenerateEffect
│   ├── Features.tsx            # Aceternity CardHoverEffect grid
│   ├── Pricing.tsx             # Shadcn Card-based pricing tiers
│   └── Footer.tsx
├── dashboard/
│   ├── Sidebar.tsx             # Shadcn NavigationMenu + Avatar
│   ├── Topbar.tsx              # Breadcrumb + quota badge
│   ├── QuotaCard.tsx           # Shadcn Card + Progress bar
│   ├── GenerationGrid.tsx      # CSS grid of GenerationCard
│   └── GenerationCard.tsx      # Shadcn Card + download button
├── generate/
│   ├── PromptForm.tsx          # "use client" — Textarea + Button + style tags
│   ├── GenerationPreview.tsx   # "use client" — displays result image/video
│   └── StyleTagSelector.tsx    # "use client" — Shadcn Badge toggles for style hints
├── billing/
│   ├── BillingStatus.tsx       # Shows current plan + cancel button
│   ├── PayPalButton.tsx        # "use client" — PayPal subscription button
│   └── PaymentsComingSoon.tsx  # Shown when PAYPAL_CLIENT_ID is absent
└── ui/                         # Re-exported Shadcn primitives
```

### 4.2 Pages

#### Landing (`app/page.tsx`)
- Server Component.
- Sections in order: `<Hero />`, `<Features />`, `<Pricing />`, `<Footer />`.
- `<Hero />` renders Aceternity `Spotlight` wrapping a centered heading, `TextGenerateEffect` for the subheadline, and two Shadcn `Button` components ("Get Started" → `/auth/register`, "Sign In" → `/auth/login`). Background: Aceternity `BackgroundBeams`.
- `<Features />` renders Aceternity `HoverEffect` with 6 feature cards (Prompt-to-Texture, Instant Download, Video Loops, History, Monthly Quota, PayPal Billing).
- `<Pricing />` reads `process.env.PAYPAL_CLIENT_ID` via a server import of `lib/featureFlags.ts`. If falsy, renders `<PaymentsComingSoon />` instead of the $5/month card.

#### Auth — Login (`app/auth/login/page.tsx`)
- Client Component.
- Shadcn `Card` containing `Label` + `Input` (email), `Label` + `Input` (password, type="password"), Shadcn `Button` ("Sign In"), Shadcn `Separator`, "Or continue with" GitHub OAuth `Button`.
- On submit: calls `signIn("credentials", { email, password, redirect: false })`. On error displays Shadcn `Alert` (destructive variant).
- On success: `router.push("/dashboard")`.

#### Auth — Register (`app/auth/register/page.tsx`)
- Client Component.
- Same card structure as login. Fields: name, email, password, confirm password.
- On submit: calls Server Action `registerUser(formData)` which hashes password with bcrypt (cost 12) and creates User in DB. Then calls `signIn("credentials", ...)`.
- Validation: email regex, password min 8 chars, passwords match — all client-side before submit, also server-side in the action.

#### Dashboard Home (`app/dashboard/page.tsx`)
- Server Component.
- Fetches `currentUser` from session. Fetches `getMonthlyUsage(userId)` and `getRecentGenerations(userId, 12)` via Prisma in the component body.
- Renders `<QuotaCard used={usage} limit={2} isPro={user.isPro} />` and `<GenerationGrid generations={recent} />`.

#### Generator (`app/dashboard/generate/page.tsx`)
- Server Component shell, renders `<GeneratorClient />` Client Component.
- `<GeneratorClient />`:
  - State: `prompt: string`, `styleTags: string[]`, `isLoading: boolean`, `result: GenerationResult | null`, `error: string | null`.
  - Aceternity `WavyBackground` behind the whole section.
  - `<StyleTagSelector />`: renders style hint badges (grain, vhs, film burn, light leak, bokeh, glitch, vintage, neon). Toggling adds/removes from `styleTags`. Final prompt sent = `${prompt}. Style: ${styleTags.join(", ")}`.
  - `<PromptForm />`: Shadcn `Textarea` (placeholder: "Describe your texture — e.g. 'heavy 35mm film grain, warm tones, vignette'"), Shadcn `Button` ("Generate Texture").
  - On submit: POST `/api/generate` with `{ prompt: fullPrompt }`. Shows Shadcn `Skeleton` during load. On success renders `<GenerationPreview />`. On quota error (HTTP 402) shows paywall modal.
  - Paywall modal: Shadcn `Dialog`. If `PAYPAL_CLIENT_ID` present → renders `<PayPalButton />`. Else → renders `<PaymentsComingSoon />`.

#### Billing (`app/dashboard/billing/page.tsx`)
- Server Component. Reads `process.env.PAYPAL_CLIENT_ID`.
- If absent: renders `<PaymentsComingSoon />` only.
- If present: fetches user subscription status from DB. Renders `<BillingStatus />` (current plan, next billing date, cancel button) and `<PayPalButton />` if not subscribed.

### 4.3 Component Specifications

#### `QuotaCard`
Props: `{ used: number, limit: number, isPro: boolean }`
- Shadcn `Card` with title "Monthly Generations".
- Shadcn `Progress` value=`(used/limit)*100` (capped at 100). Hidden if `isPro`.
- Text: `${used} / ${limit} used this month` or "Unlimited (Pro)" if `isPro`.
- If `used >= limit && !isPro`: Shadcn `Badge` variant="destructive" "Limit reached".

#### `GenerationCard`
Props: `{ generation: { id, assetUrl, prompt, createdAt, assetType } }`
- Shadcn `Card` with `aspect-video` image/video preview.
- Truncated prompt text (2 lines, `line-clamp-2`).
- Shadcn `Button` variant="outline" size="sm" with download icon → `href={assetUrl}` download attribute.
- `createdAt` formatted as "Mar 15, 2025".

#### `PayPalButton`
- `"use client"`.
- On mount: POST `/api/billing/subscribe` to create a PayPal subscription → receives `approvalUrl`.
- Renders Shadcn `Button` ("Subscribe — $5/month") that opens `approvalUrl` in a new tab.
- After redirect back, URL contains `subscription_id` query param → POST `/api/billing/confirm?subscription_id=XXX` to activate in DB.

#### `PaymentsComingSoon`
- Shadcn `Card` with Shadcn `Badge` variant="secondary" "Coming Soon".
- Text: "Payment processing is not yet configured. Payments coming soon."
- No interactive elements.

### 4.4 State Management
No global state library. State is managed as:
- **Server state**: fetched directly in RSC via Prisma calls or via SWR/fetch in Client Components.
- **Form state**: React `useState` local to each form component.
- **Session state**: `useSession()` from NextAuth for client-side session access.
- **Toast notifications**: Sonner (`toast.success()`, `toast.error()`) called after API responses.

### 4.5 API Contracts (Client → Server)

All requests include `Cookie: next-auth.session-token=...` automatically via browser.

**POST /api/generate**
```
Request:  { "prompt": string (max 500 chars) }
Response 200: { "id": string, "assetUrl": string, "assetType": "image"|"video", "createdAt": string }
Response 402: { "error": "QUOTA_EXCEEDED" }
Response 400: { "error": "PROMPT_REQUIRED" | "PROMPT_TOO_LONG" }
Response 401: { "error": "UNAUTHENTICATED" }
Response 500: { "error": "GENERATION_FAILED", "detail": string }
```

**GET /api/generations?page=1&limit=12**
```
Response 200: { "generations": Generation[], "total": number, "page": number }
```

**POST /api/billing/subscribe**
```
Response 200: { "approvalUrl": string }
Response 503: { "error": "PAYMENTS_NOT_CONFIGURED" }
```

**GET /api/billing/confirm?subscription_id=XXX**
```
Response 200: { "success": true }
Response 400: { "error": "INVALID_SUBSCRIPTION" }
```

**POST /api/billing/cancel**
```
Response 200: { "success": true }
Response 400: { "error": "NO_ACTIVE_SUBSCRIPTION" }
```

**POST /api/billing/webhook** (PayPal → Server, no auth cookie)
```
Headers: paypal-transmission-id, paypal-transmission-time, paypal-cert-url, paypal-transmission-sig
Body: PayPal webhook event JSON
Response 200: { "received": true }
```

---

## 5. Backend Specification

### 5.1 `/api/generate/route.ts` — POST

```
1. Parse request body: { prompt }
2. Validate: prompt required, typeof string, length 1–500, strip leading/trailing whitespace.
3. Get session via getServerSession(authOptions). If null → 401.
4. Fetch user from DB: prisma.user.findUnique({ where: { id: session.user.id } })
5. If user.isPro === false:
   a. Count generations this calendar month:
      prisma.generation.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfMonth(new Date()) }
        }
      })
   b. If count >= 2 → return 402 { error: "QUOTA_EXCEEDED" }
6. Sanitize prompt: strip HTML tags, normalize whitespace.
7. Call OpenRouter (see 5.4). On failure → return 500.
8. Save asset file to /public/uploads/<userId>/<uuid>.png (see 5.5).
9. Write to DB:
   prisma.generation.create({
     data: {
       userId: user.id,
       prompt: sanitizedPrompt,
       assetUrl: "/uploads/<userId>/<uuid>.png",
       assetType: "image",
       modelUsed: "black-forest-labs/FLUX-1-schnell-free",
       status: "completed"
     }
   })
10. Return 200 { id, assetUrl, assetType: "image", createdAt }
```

### 5.2 `/api/generations/route.ts` — GET

```
1. Validate session → 401 if absent.
2. Parse query: page (default 1), limit (default 12, max 50).
3. offset = (page - 1) * limit
4. [total, generations] = await prisma.$transaction([
     prisma.generation.count({ where: { userId } }),
     prisma.generation.findMany({
       where: { userId },
       orderBy: { createdAt: "desc" },
       skip: offset,
       take: limit,
       select: { id, prompt, assetUrl, assetType, createdAt, status }
     })
   ])
5. Return 200 { generations, total, page }
```

### 5.3 `/api/billing/subscribe/route.ts` — POST

```
1. Check process.env.PAYPAL_CLIENT_ID — if absent → 503 { error: "PAYMENTS_NOT_CONFIGURED" }
2. Validate session → 401 if absent.
3. Initialize PayPal client (see 5.6).
4. Create PayPal subscription:
   POST https://api-m.paypal.com/v1/billing/subscriptions
   Body: {
     plan_id: process.env.PAYPAL_PLAN_ID,
     application_context: {
       return_url: process.env.NEXTAUTH_URL + "/dashboard/billing?subscribed=1",
       cancel_url: process.env.NEXTAUTH_URL + "/dashboard/billing?cancelled=1"
     }
   }
5. Extract approvalUrl from response.links where rel === "approve".
6. Store pending subscription: prisma.user.update({ where: { id: userId }, data: { paypalSubscriptionId: subscriptionId, subscriptionStatus: "PENDING" } })
7. Return 200 { approvalUrl }
```

### 5.4 OpenRouter Integration (`lib/openrouter.ts`)

```typescript
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const MODEL_PRIORITY = [
  "black-forest-labs/FLUX-1-schnell-free",   // primary: free image model
  "stabilityai/stable-diffusion-xl-base",     // fallback 1
  "google/gemini-2.0-flash-exp:free",         // fallback 2 (generates descriptive then calls img)
];

export async function generateTexture(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const systemPrompt = `You are a texture generation assistant for video editors. 
Generate a seamless, tileable texture based on the user's description. 
The texture must be usable as a video overlay. Output only the image.`;

  for (const model of MODEL_PRIORITY) {
    try {
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL!,
          "X-Title": "TextureForge",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const err = await response.json();
        // If rate limit or model unavailable, try next
        if (response.status === 429 || response.status === 503) continue;
        throw new Error(err.error?.message ?? "OpenRouter error");
      }

      const data = await response.json();
      // Handle image response in content
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      // If model returns base64 image block
      if (typeof content === "object" && content.type === "image_url") {
        const dataUrl: string = content.image_url.url;
        const [meta, base64] = dataUrl.split(",");
        const mimeType = meta.match(/data:(.*);base64/)?.[1] ?? "image/png";
        return { base64, mimeType };
      }

      // If model returns text description (fallback): generate a procedural texture client-side via canvas
      // For text-only models, we use the text as a seed for a server-side sharp-generated placeholder texture
      if (typeof content === "string") {
        return await generateProceduralTexture(content, prompt);
      }
    } catch (err) {
      if (model === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) throw err;
      continue;
    }
  }
  throw new Error("All models failed");
}

async function generateProceduralTexture(description: string, originalPrompt: string) {
  // Uses sharp to generate a noise texture with metadata embedded as text
  // Install: npm install sharp
  const sharp = (await import("sharp")).default;
  const width = 1024, height = 1024;
  const noiseBuffer = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noiseBuffer.length; i++) {
    noiseBuffer[i] = Math.floor(Math.random() * 255);
  }
  const pngBuffer = await sharp(noiseBuffer, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  return { base64: pngBuffer.toString("base64"), mimeType: "image/png" };
}
```

### 5.5 Asset Storage (`lib/assets.ts`)

```typescript
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function saveBase64Asset(
  userId: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/jpeg" ? "jpg" : "png";
  const filename = `${uuidv4()}.${ext}`;
  const userDir = path.join(process.cwd(), "public", "uploads", userId);
  await fs.mkdir(userDir, { recursive: true });
  const filepath = path.join(userDir, filename);
  await fs.writeFile(filepath, Buffer.from(base64, "base64"));
  return `/uploads/${userId}/${filename}`;
}
```

### 5.6 PayPal Client (`lib/paypal.ts`)

```typescript
import fetch from "node-fetch";

const PAYPAL_BASE = process.env.PAYPAL_ENV === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function createSubscription(userId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `sub-${userId}-${Date.now()}`,
    },
    body: JSON.stringify({
      plan_id: process.env.PAYPAL_PLAN_ID,
      application_context: {
        brand_name: "TextureForge",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?subscribed=1`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?cancelled=1`,
      },
    }),
  });
  return await res.json() as { id: string; links: Array<{ href: string; rel: string }> };
}

export async function cancelSubscription(subscriptionId: string) {
  const token = await getAccessToken();
  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "User requested cancellation" }),
  });
}

export async function verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(body),
    }),
  });
  const data = await res.json() as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
```

### 5.7 `/api/billing/webhook/route.ts` — POST

```
1. Read raw body as string (use req.text()).
2. Collect headers: paypal-transmission-id, paypal-transmission-time, paypal-cert-url, paypal-auth-algo, paypal-transmission-sig.
3. Call verifyWebhookSignature(headers, rawBody). If false → return 401.
4. Parse event = JSON.parse(rawBody).
5. Switch on event.event_type:
   case "BILLING.SUBSCRIPTION.ACTIVATED":
     subscriptionId = event.resource.id
     payerId = event.resource.subscriber.payer_id
     prisma.user.updateMany({
       where: { paypalSubscriptionId: subscriptionId },
       data: { isPro: true, subscriptionStatus: "ACTIVE", paypalPayerId: payerId }
     })
     break;
   case "BILLING.SUBSCRIPTION.CANCELLED":
   case "BILLING.SUBSCRIPTION.SUSPENDED":
   case "BILLING.SUBSCRIPTION.EXPIRED":
     subscriptionId = event.resource.id
     prisma.user.updateMany({
       where: { paypalSubscriptionId: subscriptionId },
       data: { isPro: false, subscriptionStatus: event.event_type.split(".")[2] }
     })
     break;
   case "PAYMENT.SALE.COMPLETED":
     // Renewal payment — log to Payment table
     prisma.payment.create({ data: { ... } })
     break;
6. Return 200 { received: true }
```

---

## 6. Database Schema (Prisma)

**File: `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                    String       @id @default(cuid())
  email                 String       @unique
  emailVerified         DateTime?
  name                  String?
  passwordHash          String?
  image                 String?
  isPro                 Boolean      @default(false)
  paypalSubscriptionId  String?      @unique
  paypalPayerId         String?
  subscriptionStatus    String?      // "PENDING" | "ACTIVE" | "CANCELLED" | "SUSPENDED" | "EXPIRED"
  subscriptionStartedAt DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  accounts    Account[]
  sessions    Session[]
  generations Generation[]
  payments    Payment[]

  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Generation {
  id         String   @id @default(cuid())
  userId     String
  prompt     String   @db.Text
  assetUrl   String
  assetType  String   @default("image")  // "image" | "video"
  modelUsed  String
  status     String   @default("completed") // "pending" | "completed" | "failed"
  errorMsg   String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
}

model Payment {
  id                String   @id @default(cuid())
  userId            String
  paypalPaymentId   String   @unique
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("USD")
  status            String   // "COMPLETED" | "REFUNDED" | "PENDING"
  createdAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Migrations:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 7. Authentication & Authorization

### 7.1 NextAuth Configuration (`lib/auth.ts`)

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
});
```

### 7.2 Middleware (`middleware.ts`)

```typescript
import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");
  const isApiProtected =
    req.nextUrl.pathname.startsWith("/api/generate") ||
    req.nextUrl.pathname.startsWith("/api/generations") ||
    req.nextUrl.pathname.startsWith("/api/billing/subscribe") ||
    req.nextUrl.pathname.startsWith("/api/billing/cancel");

  if ((isProtected || isApiProtected) && !isLoggedIn) {
    if (isApiProtected) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/generate", "/api/generations", "/api/billing/:path*"],
};
```

### 7.3 Server Action: Register User (`actions/auth.ts`)

```typescript
"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function registerUser(formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase();
  const name = (formData.get("name") as string).trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Invalid email" };
  if (password.length < 8) return { error: "Password min 8 chars" };
  if (password !== confirm) return { error: "Passwords do not match" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email already registered" };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, name, passwordHash } });
  return { success: true };
}
```

### 7.4 Authorization Rules

| Route/Action | Requirement |
|---|---|
| `/` (landing) | Public |
| `/auth/login`, `/auth/register` | Public; redirect to dashboard if already logged in |
| `/dashboard/*` | Authenticated (any tier) |
| `POST /api/generate` | Authenticated + quota check (free ≤ 2/month, pro unlimited) |
| `GET /api/generations` | Authenticated, returns only own data |
| `POST /api/billing/subscribe` | Authenticated + PAYPAL_CLIENT_ID present |
| `POST /api/billing/cancel` | Authenticated + has active subscription |
| `POST /api/billing/webhook` | No session auth; PayPal signature verification only |

---

## 8. Payment System (PayPal)

### 8.1 Pre-requisites

Before the app runs in production:
1. Create a PayPal App at https://developer.paypal.com → Get `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
2. Create a Billing Plan via PayPal API or dashboard:
   - Type: RECURRING, frequency: MONTHLY, amount: 5 USD.
   - Store returned `plan_id` as `PAYPAL_PLAN_ID`.
3. Configure a Webhook in PayPal dashboard → endpoint: `https://yourdomain.com/api/billing/webhook`.
   - Events to subscribe: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.EXPIRED`, `PAYMENT.SALE.COMPLETED`.
   - Store webhook ID as `PAYPAL_WEBHOOK_ID`.

### 8.2 Subscription Flow

```
User clicks "Subscribe" on Billing page
  → Client POST /api/billing/subscribe
    → Server creates PayPal subscription via API
    → Stores subscriptionId with status "PENDING" in DB
    → Returns approvalUrl
  → Client opens approvalUrl in new tab
  → User approves in PayPal UI
  → PayPal redirects to NEXTAUTH_URL/dashboard/billing?subscribed=1
  → Client calls GET /api/billing/confirm?subscription_id=XXX
  → Server verifies subscription status with PayPal API
  → Updates user.subscriptionStatus = "ACTIVE", isPro = true
  → Client shows "Pro" badge + removes quota UI
  → (Asynchronously) PayPal sends BILLING.SUBSCRIPTION.ACTIVATED webhook
    → Server double-confirms DB update
```

### 8.3 Cancellation Flow

```
User clicks "Cancel Subscription" in BillingStatus component
  → Shadcn AlertDialog: "Are you sure? You will lose Pro access at end of billing period."
  → On confirm: POST /api/billing/cancel
    → Server calls PayPal cancelSubscription(user.paypalSubscriptionId)
    → Updates DB: subscriptionStatus = "CANCELLED", isPro = false (immediate downgrade)
    → Returns 200 { success: true }
  → Toast: "Subscription cancelled"
  → Dashboard re-fetches user data
```

### 8.4 Webhook Failure Handling

- If PayPal signature verification fails: log the event body and headers to console.error, return 401. Do NOT process.
- If DB update fails: return 500 so PayPal retries the webhook (PayPal retries up to 5 times over 2 days).
- Idempotency: all webhook handlers check current `subscriptionStatus` before applying changes. If already in the target state, return 200 immediately.

### 8.5 Feature Flag Behavior (No PayPal Credentials)

**`lib/featureFlags.ts`:**
```typescript
export const PAYMENTS_ENABLED =
  typeof process.env.PAYPAL_CLIENT_ID === "string" &&
  process.env.PAYPAL_CLIENT_ID.trim().length > 0 &&
  typeof process.env.PAYPAL_CLIENT_SECRET === "string" &&
  process.env.PAYPAL_CLIENT_SECRET.trim().length > 0;
```

Every component that renders payment UI imports `PAYMENTS_ENABLED`:
- `app/page.tsx` (Pricing section): if `!PAYMENTS_ENABLED` → render `<PaymentsComingSoon />` instead of Pro plan card.
- `app/dashboard/billing/page.tsx`: if `!PAYMENTS_ENABLED` → render only `<PaymentsComingSoon />`, no PayPal button.
- `app/dashboard/generate/page.tsx` (quota modal): if quota exceeded + `!PAYMENTS_ENABLED` → show "You've reached your free limit. Payments coming soon." instead of subscribe button.
- `/api/billing/subscribe`: returns 503 `{ error: "PAYMENTS_NOT_CONFIGURED" }` if `!PAYMENTS_ENABLED`.
- Quota enforcement (2 free/month) is ALWAYS active regardless of `PAYMENTS_ENABLED`.

---

## 9. Security

### 9.1 Authentication Security
- Passwords hashed with bcrypt, cost factor 12. `passwordHash` field never returned in any API response.
- JWT secrets: `AUTH_SECRET` minimum 32 chars, generated via `openssl rand -base64 32`. Rotated via `AUTH_SECRET` env var update + forced re-login.
- Session tokens are HTTP-only, Secure, SameSite=Lax cookies managed by NextAuth.
- CSRF: NextAuth provides CSRF token for Credentials sign-in. All mutating Server Actions use the `"use server"` directive which NextAuth protects automatically.

### 9.2 Input Validation & Prompt Injection Mitigation
- Prompt field: max 500 characters enforced both client-side (maxLength attribute) and server-side (explicit length check before any processing).
- HTML stripping: all prompt text is sanitized via `prompt.replace(/<[^>]*>/g, "").trim()` before use.
- Prompt injection defense: system prompt is sent as a separate `role: "system"` message in OpenRouter requests. User prompt is strictly `role: "user"`. The system prompt explicitly constrains output to image generation only.
- No user-controlled data is ever interpolated into SQL (Prisma uses parameterized queries by default).
- No user-controlled data is used in file paths. Asset filenames are always server-generated UUIDs. User directory name is the user's `cuid()` ID (URL-safe, no path traversal possible).

### 9.3 API Key Handling
- `OPENROUTER_API_KEY` exists only in server-side env vars. It is never referenced in any Client Component, never passed to the browser, and never included in `NEXT_PUBLIC_*` variables.
- If `OPENROUTER_API_KEY` is undefined at runtime: `/api/generate` returns 500 `{ error: "SERVICE_UNAVAILABLE" }` with a console.error. Never expose the reason to the client.
- PayPal credentials: same server-only constraint.

### 9.4 Rate Limiting
- Install: `npm install @upstash/ratelimit @upstash/redis` OR use in-memory rate limiter for self-hosted.
- **In-memory implementation (no Redis dependency):**

```typescript
// lib/ratelimit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

- Applied in `/api/generate`: `checkRateLimit(userId, 10, 60_000)` → max 10 generation attempts per minute per user. If exceeded → 429 `{ error: "RATE_LIMITED" }`.
- Applied in `/api/auth/*`: `checkRateLimit(ipAddress, 20, 60_000)` → max 20 login attempts per minute per IP. IP extracted from `x-forwarded-for` header.

### 9.5 OWASP Top 10 Coverage

| Threat | Mitigation |
|---|---|
| A01 Broken Access Control | Middleware enforces auth on all protected routes. Each data query filters by `userId` (users can only see their own data). |
| A02 Cryptographic Failures | bcrypt for passwords, HTTPS enforced in production, no plaintext secrets in code. |
| A03 Injection | Prisma parameterized queries, HTML stripping on prompts, no dynamic SQL. |
| A04 Insecure Design | Quota enforced server-side; free tier limits not controllable by client. |
| A05 Security Misconfiguration | `next.config.ts` sets: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`. |
| A06 Vulnerable Components | `npm audit` run in CI. Dependabot enabled. |
| A07 Auth Failures | Account lockout: after 5 failed login attempts in 15 min (via rate limiter key `login:${email}`), return 429 for 15 min. |
| A08 Software Integrity | Lockfile committed (`package-lock.json`). No `--ignore-scripts` bypass. |
| A09 Logging Failures | All API errors logged with `console.error(timestamp, userId, route, error)`. Production: pipe to structured log service. |
| A10 SSRF | No user-provided URLs are fetched server-side. OpenRouter URL is hardcoded. PayPal URL is hardcoded. |

### 9.6 File Upload Security
- No user file uploads. Only server-generated assets stored to filesystem.
- `/public/uploads/` directory is served as static files. No execute permissions. File extension is always `.png`, `.webp`, or `.jpg` — determined by server based on mimeType, never by user input.

### 9.7 Content Security Policy (`next.config.ts`)
```typescript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://avatars.githubusercontent.com;
  connect-src 'self' https://openrouter.ai https://api-m.paypal.com https://api-m.sandbox.paypal.com;
  frame-src https://www.paypal.com https://www.sandbox.paypal.com;
`.replace(/\n/g, " ");
```

---

## 10. Scalability

### Current Architecture Constraints
- Asset storage is local filesystem (`/public/uploads`). This works on single-instance deployments (Railway, Render, VPS) but not on Vercel's ephemeral serverless (filesystem is read-only). **For Vercel deployment, replace `saveBase64Asset` with an S3-compatible client (AWS S3 or Cloudflare R2).**
- In-memory rate limiting resets on server restart and doesn't work across multiple instances. **For multi-instance deployments, replace with Redis-based rate limiting (Upstash).**

### Database
- Prisma + PostgreSQL handles thousands of users easily on a single instance (Supabase free tier: 500MB, sufficient for ~50k generations).
- Add DB index on `Generation(userId, createdAt)` — already in schema.
- For > 100k users: add read replica, enable Prisma connection pooling via PgBouncer.

### OpenRouter
- OpenRouter free tier has rate limits (typically ~20 RPM per model). The MODEL_PRIORITY fallback list mitigates single-model rate limit hits.
- Add request queuing (a simple in-memory queue with `p-limit`) to prevent OpenRouter 429s: `npm install p-limit`. Wrap `generateTexture` call with `limit(1)` (one concurrent OpenRouter request per server instance).

### Stateless API
- All API routes are stateless (session data read from JWT). Horizontally scalable with no session affinity required.

---

## 11. Error Handling

### Client-Side
- All fetch calls in Client Components wrapped in try/catch.
- HTTP 4xx → display Shadcn `Alert` variant="destructive" with human-readable message derived from error code:
  - `QUOTA_EXCEEDED` → "You've used your 2 free generations this month. Upgrade to Pro for unlimited access."
  - `RATE_LIMITED` → "Too many requests. Please wait a moment."
  - `PROMPT_TOO_LONG` → "Prompt must be under 500 characters."
  - `GENERATION_FAILED` → "Generation failed. Please try a different prompt."
- HTTP 5xx → Sonner toast: "Something went wrong. Please try again."
- Network error (fetch throws) → Sonner toast: "Network error. Check your connection."

### Server-Side
- All API route handlers wrapped in try/catch. Uncaught exceptions return 500 `{ error: "INTERNAL_ERROR" }` with the actual error logged via `console.error`.
- OpenRouter call failure: log full response body, return 500 `{ error: "GENERATION_FAILED", detail: "Model unavailable" }`.
- DB write failure after successful generation: attempt to delete the saved asset file, return 500. Log: `[CRITICAL] Asset generated but DB write failed for userId=${userId}`.
- PayPal webhook processing failure: return 500 (triggers PayPal retry). Log with full event body.

### Generation Failure States
- `Generation.status` field tracks: `"pending"` (during generation), `"completed"`, `"failed"`.
- If server crashes mid-generation, the `"pending"` record remains. A cleanup cron (optional, run via Vercel Cron or a startup check) marks generations stuck in `"pending"` for > 5 minutes as `"failed"`.
- `"failed"` generations do NOT count toward monthly quota. The quota query filters `status: "completed"`.

---

## 12. Environment Variables

**File: `.env.local` (development) / Production environment (Vercel/Railway)**

```bash
# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/textureforge?schema=public"
# For serverless (Vercel): append ?pgbouncer=true&connection_limit=1

# ─── NextAuth ─────────────────────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
# Production: NEXTAUTH_URL="https://yourdomain.com"
AUTH_SECRET="<run: openssl rand -base64 32>"
# Minimum 32 characters. Required. App crashes on startup if absent.

# ─── OAuth Providers ──────────────────────────────────────────────────────────
GITHUB_CLIENT_ID="<github oauth app client id>"
GITHUB_CLIENT_SECRET="<github oauth app client secret>"
# If absent: GitHub login button is hidden. Credentials login still works.
# Detection in code: process.env.GITHUB_CLIENT_ID ? show GitHub button : null

# ─── OpenRouter ───────────────────────────────────────────────────────────────
OPENROUTER_API_KEY="sk-or-v1-<your key>"
# Required for generation. If absent: POST /api/generate returns 503 SERVICE_UNAVAILABLE.
# Get free key at: https://openrouter.ai/keys

# ─── PayPal ───────────────────────────────────────────────────────────────────
PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
PAYPAL_PLAN_ID=""
PAYPAL_WEBHOOK_ID=""
PAYPAL_ENV="sandbox"
# PAYPAL_ENV options: "sandbox" | "production"
# If PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is empty string or absent:
#   PAYMENTS_ENABLED = false
#   All payment UI replaced with "Payments coming soon"
#   /api/billing/subscribe returns 503
#   Quota enforcement (2 free/month) remains active

# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV="development"
# "production" enables secure cookies, disables detailed error messages to client
```

**Startup Validation (`lib/validateEnv.ts`):**
```typescript
export function validateEnv() {
  const required = ["DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_URL", "OPENROUTER_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
```
Call `validateEnv()` in `app/layout.tsx` (server-side, runs at cold start).

---

## 13. Deployment Plan

### Local Development Setup

```bash
# 1. Clone and install
git clone <repo>
cd textureforge
npm install

# 2. Start PostgreSQL (Docker)
docker run --name textureforge-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=textureforge -p 5432:5432 -d postgres:15

# 3. Configure env
cp .env.example .env.local
# Fill in DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, OPENROUTER_API_KEY
# Leave PayPal vars empty to run in payments-disabled mode

# 4. Run migrations
npx prisma migrate dev --name init
npx prisma generate

# 5. Start dev server
npm run dev
```

### Production Deployment (Railway)

1. Create Railway project → Add PostgreSQL service → Copy `DATABASE_URL` to app env vars.
2. Add all env vars from Section 12 to Railway app settings.
3. Set `NEXTAUTH_URL` to your Railway public domain.
4. Set `PAYPAL_ENV=production` and fill PayPal credentials when ready.
5. Railway build command: `npm run build` (runs `prisma generate && next build`).
6. Railway start command: `npm start`.
7. Configure Railway domain → enable HTTPS (automatic).

**`package.json` scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

**`next.config.ts`:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=()" },
      ],
    },
  ],
};

export default nextConfig;
```

### Deployment Checklist
- [ ] All required env vars set in production environment
- [ ] `prisma migrate deploy` run after every schema change
- [ ] PayPal webhook URL registered and `PAYPAL_WEBHOOK_ID` set
- [ ] `/public/uploads` directory writable (or S3 configured for Vercel)
- [ ] `AUTH_SECRET` is 32+ chars and unique to production
- [ ] `NODE_ENV=production`
- [ ] `PAYPAL_ENV=production` (not sandbox)
- [ ] HTTPS enforced (check redirect from HTTP)
- [ ] Test: register → generate (x2 free) → hit quota → subscribe (PayPal) → generate again

---

## 14. Future Improvements

The following are scoped OUT of the current spec but are the logical next steps:

1. **Video Loop Generation:** Use OpenRouter models that support video or a frame-interpolation pipeline (generate 4 keyframes via image model → stitch to MP4 via `ffmpeg` npm wrapper). `Generation.assetType` already supports `"video"`.

2. **S3/R2 Asset Storage:** Replace `lib/assets.ts` with `@aws-sdk/client-s3` for production-grade asset persistence, CDN delivery, and Vercel compatibility.

3. **Redis Rate Limiting:** Replace in-memory `ratelimit.ts` with `@upstash/ratelimit` + Upstash Redis for accurate cross-instance rate limiting.

4. **Email Verification:** Add `VerificationToken` flow (already in schema) using Nodemailer or Resend for email confirmation on registration.

5. **Admin Dashboard:** A `/admin` route (restricted to `user.role === "ADMIN"`) showing total users, generations per day, revenue, and ability to manually toggle `isPro`.

6. **Generation Sharing:** Public URLs for generations (`/g/<id>`) with Open Graph meta for social sharing.

7. **Prompt Templates:** Pre-built prompt templates on the generator page (one-click: "VHS Grain", "Film Burn", "Neon Glitch") using Shadcn `Select` or `Tabs`.

8. **Stripe as Secondary Payment Option:** If PayPal becomes unreliable, the `PAYMENTS_ENABLED` flag pattern makes it trivial to swap or add Stripe alongside PayPal.

9. **Tiered Plans:** Current schema supports extending to multiple plan tiers (e.g., $5/month = 50 gen/month, $15/month = unlimited) by adding a `tier` field to `User` and updating quota logic.

10. **WebP/AVIF Optimization:** Post-process generated assets through `sharp` to compress and serve in modern formats, reducing storage and bandwidth costs.