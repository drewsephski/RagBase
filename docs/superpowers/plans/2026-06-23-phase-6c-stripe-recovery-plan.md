# Implementation Plan — Phase 6c: Stripe Pro + Recovery

**Specs:** [2026-06-23-feature-roadmap-design.md](../specs/2026-06-23-feature-roadmap-design.md), [2026-06-22-ocr-and-crawl-design.md](../specs/2026-06-22-ocr-and-crawl-design.md) §1–2  
**Date:** 2026-06-23  
**Scope:** Safe billing foundation only — subscription state, webhooks, recovery, portal, feature flags, checkout return UX

## Solution approach

Ship anonymous Pro subscriptions via **Stripe Payment Link** + `client_reference_id={workspaceId}`. Webhooks are the source of truth for `plan` and subscription status — never trust the client or return URL alone. Recovery links let Pro users restore workspace credentials without accounts. Feature flags gate live checkout until webhooks, recovery, and portal are verified in test mode.

**Stripe integration note:** The product spec locks Payment Links (dashboard-configured subscription link). Do not migrate to Checkout Sessions API in 6c unless Payment Link blockers appear — keep scope narrow.

## Out of scope (explicit)

- Crawl API, crawl UI, crawl quota meters (6d)
- Template-aware paywall copy
- Waitlist → Pro launch email
- Email-based recovery via checkout email
- Document-aware starters / Phase 2 product work
- Raising free tier limits for Pro

---

## Prerequisites — Stripe Dashboard (before coding)

1. Create **Product** “RagBase Pro” with recurring price ($9/mo or $1 test price for live smoke test).
2. Create **Payment Link** for that price:
   - Enable **client reference ID** passthrough (append `?client_reference_id={WORKSPACE_ID}` from app).
   - Set success URL: `{NEXT_PUBLIC_APP_URL}/app?checkout=success`
   - Set cancel URL: `{NEXT_PUBLIC_APP_URL}/app?checkout=cancel`
3. Enable **Customer Portal** (cancel subscription, update payment method).
4. Create webhook endpoint pointing to `{NEXT_PUBLIC_APP_URL}/api/webhooks/stripe` with events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy `STRIPE_WEBHOOK_SECRET` (test mode first).
6. Prefer a **restricted API key** (`rk_`) with permissions: Customers (write), Subscriptions (read/write), Billing Portal (write), Checkout Sessions (read) — or minimal set for portal session creation.

---

## Step 0 — Dependencies & env

**Files:** `package.json`, `.env.example`, `lib/env/server.ts`, `lib/env/public.ts`

**Work:**

```bash
pnpm add stripe
```

Add env vars:

```txt
# Server
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOKS_ENABLED=false          # server: process events only when true

# Public
NEXT_PUBLIC_BILLING_ENABLED=false      # show live checkout CTA only when true
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=   # dashboard Payment Link base URL
NEXT_PUBLIC_STRIPE_SUCCESS_URL=        # optional override; default /app?checkout=success
NEXT_PUBLIC_STRIPE_CANCEL_URL=         # optional override; default /app?checkout=cancel
NEXT_PUBLIC_PRO_PRICE_DISPLAY=$9/mo
NEXT_PUBLIC_SUPPORT_EMAIL=support@ragbase.dev
NEXT_PUBLIC_APP_URL=https://www.ragbase.dev
```

Helpers:

- `lib/billing/flags.ts` — `isBillingEnabled()`, `isWebhooksEnabled()`
- `lib/support.ts` — `getSupportEmail()`, `supportMailto(subject?)`
- `lib/stripe/client.ts` — singleton `Stripe` instance (server-only)

**Verification:**

```bash
npm run typecheck
```

---

## 6c.1 — Schema + webhook + subscription state

### Step 1 — Billing schema migration

**Files:** `supabase/migrations/YYYYMMDD_billing_pro.sql`

**Work:**

Extend `workspaces`:

```sql
-- Migrate paid_future → pro where present; update check constraint
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_check;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_plan_check
  CHECK (plan IN ('anonymous', 'free', 'pro'));

UPDATE workspaces SET plan = 'anonymous' WHERE plan = 'paid_future';

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS pro_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS crawl_count_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crawled_pages_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crawl_period_start timestamptz;

CREATE INDEX IF NOT EXISTS workspaces_stripe_customer_id_idx
  ON workspaces (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_stripe_subscription_id_idx
  ON workspaces (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
```

Idempotency for webhooks:

```sql
CREATE TABLE stripe_webhook_events (
  id text PRIMARY KEY,              -- Stripe event id evt_...
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
```

**Verification:** Apply migration on dev Supabase; confirm existing workspaces unchanged except `paid_future` → `anonymous`.

---

### Step 2 — Billing domain types & Pro check

**Files:** `lib/billing/types.ts`, `lib/billing/pro-plan.ts`, `lib/billing/__tests__/pro-plan.test.ts`

**Work:**

```typescript
// isProActive(workspace): plan === 'pro' AND status IN ('active','trialing')
// AND (period_end IS NULL OR period_end > now)

export function isProActive(workspace: BillingWorkspace): boolean;
export function requireProPlan(workspace: BillingWorkspace): void; // throws ProRequiredError 403
```

Extend `WorkspaceContext` in `lib/workspace/auth.ts` to select billing columns on authenticated routes that need them, **or** keep `requireWorkspace` lean and add `requireWorkspaceWithBilling()` for billing routes — prefer a shared `selectBillingFields` constant to avoid drift.

Add `ProRequiredError` extending existing error pattern (`lib/billing/errors.ts`).

**Verification:**

```bash
npm test -- lib/billing/__tests__/pro-plan.test.ts
```

Test cases: active, trialing, past_due, canceled, expired period, plan anonymous.

---

### Step 3 — Stripe webhook handler

**Files:** `app/api/webhooks/stripe/route.ts`, `lib/billing/webhook-handlers.ts`, `lib/billing/__tests__/webhook-handlers.test.ts`

**Work:**

Route requirements:

- `export const runtime = 'nodejs'` (Stripe SDK)
- Read **raw body** via `await request.text()` — do not parse JSON before signature verify
- If `!isWebhooksEnabled()` → return `503` (or `200` with log — prefer 503 in dev to catch misconfig)

Handler flow:

1. Verify signature: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
2. Check `stripe_webhook_events` for `event.id` — if exists, return `200` immediately
3. Insert event id (transaction or insert-first for idempotency)
4. Dispatch by `event.type`

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Resolve `client_reference_id` → workspace UUID; fetch subscription from session; set `plan='pro'`, customer/subscription IDs, status, period bounds, `pro_activated_at=now()`; reset crawl counters aligned to period start |
| `customer.subscription.updated` | Find workspace by `stripe_subscription_id`; sync status + period; if period start advanced, reset crawl counters; if status ∉ `{active,trialing}`, downgrade (see grace below) |
| `customer.subscription.deleted` | Downgrade workspace: `plan='anonymous'`, clear Stripe fields, **retain** workspace data |
| `invoice.payment_failed` | Set `stripe_subscription_status='past_due'`; schedule downgrade after **3-day grace** (store `past_due_since` column **or** compare `invoice.created` + 3 days on subsequent webhook/sync — simplest: set status past_due immediately; downgrade only when status becomes `canceled`/`unpaid` via subscription.updated) |

**Grace period (locked):** On `past_due`, keep Pro access for 3 days. Implement via optional column `stripe_past_due_at timestamptz`; `isProActive` allows past_due if `now() < past_due_at + interval '3 days'`. Clear column when status returns to active.

Downgrade helper: `lib/billing/downgrade-workspace.ts` — single function used by webhook handlers.

**Verification:**

```bash
npm test -- lib/billing/__tests__/webhook-handlers.test.ts
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Trigger test checkout; confirm workspace row updates
```

---

### Step 4 — Subscription status API (for polling)

**Files:** `app/api/workspaces/subscription/route.ts`, `lib/billing/subscription-status.ts`

**Work:**

`GET /api/workspaces/subscription` — requires workspace headers.

Response (sanitized):

```json
{
  "plan": "anonymous" | "free" | "pro",
  "isProActive": false,
  "stripeSubscriptionStatus": "active" | null,
  "currentPeriodEnd": "2026-07-23T..." | null,
  "hasStripeCustomer": true,
  "recoveryLinkConfirmed": false
}
```

`recoveryLinkConfirmed` — optional server column `recovery_acknowledged_at` on workspace (preferred over localStorage-only) set when user clicks “I saved it”. Defer column to 6c.3 if needed; can start with client localStorage key `ragbase_recovery_confirmed_{workspaceId}`.

**Verification:** Jest test + manual curl with workspace headers.

---

## 6c.2 — Recovery tokens + recover route

### Step 5 — Recovery tokens migration

**Files:** same migration or `YYYYMMDD_workspace_recovery_tokens.sql`

**Work:**

```sql
CREATE TABLE workspace_recovery_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX workspace_recovery_tokens_token_hash_idx
  ON workspace_recovery_tokens (token_hash);

CREATE INDEX workspace_recovery_tokens_workspace_id_idx
  ON workspace_recovery_tokens (workspace_id);
```

**Token hashing:** Use **SHA-256** of `token + RECOVERY_TOKEN_PEPPER` (server env) for deterministic lookup — not bcrypt (bcrypt salts prevent indexed lookup). Never log raw tokens.

Token generation: `randomBytes(32).toString('base64url')`.

Default TTL: **90 days** (`RECOVERY_TOKEN_TTL_DAYS=90`).

---

### Step 6 — Recovery link API

**Files:** `app/api/workspaces/recovery-link/route.ts`, `lib/workspace/recovery.ts`, `lib/workspace/__tests__/recovery.test.ts`

**Work:**

`POST /api/workspaces/recovery-link` — requires workspace auth.

1. Rate-limit: 5 creates per workspace per hour + IP limit (extend `lib/rate-limit/config.ts`)
2. Optionally revoke prior active tokens (or allow multiple — spec allows regenerate; **rotate**: revoke all active, create one new)
3. Return `{ url: getRecoveryUrl(token), expiresAt }` — token shown **once** in response

`DELETE /api/workspaces/recovery-link` — revoke active tokens for workspace (optional query `tokenId`).

Use existing `getRecoveryUrl()` in `lib/site.ts` → `/app/recover?token=...`

**Verification:**

```bash
npm test -- lib/workspace/__tests__/recovery.test.ts
```

---

### Step 7 — Recover exchange API + page

**Files:** `app/api/workspaces/recover/route.ts`, `app/app/recover/page.tsx`, `app/ui/recovery/recover-workspace.tsx`

**Work:**

`POST /api/workspaces/recover` body `{ token: string }` — **no workspace auth** (token is auth).

1. Hash token, lookup row where `revoked_at IS NULL` AND `expires_at > now()`
2. Rate-limit by IP (10/hour)
3. Load workspace; return `{ workspaceId, workspaceSecret }` — **re-issue existing secret** for 6c simplicity (document in code: rotation on recovery is follow-up hardening)
4. Update `last_used_at`

Client page `/app/recover?token=...`:

1. On mount, call recover API
2. On success: `addWorkspace()` + `setActiveWorkspace()` via registry helpers
3. On failure: friendly error + `supportMailto('Recovery link issue')`
4. Redirect to `/app` with toast “Workspace restored”

**Security:** Generic error message for invalid/expired token (no enumeration).

**Verification:**

- Manual: create link in browser A → open in incognito browser B → workspace accessible
- E2E stub in 6c.6

---

## 6c.3 — Checkout return + recovery screen

### Step 8 — Checkout query param handling

**Files:** `app/ui/app.tsx`, `hooks/use-checkout-return.ts`, `app/ui/billing/checkout-pending.tsx`, `app/ui/billing/recovery-setup.tsx`

**Work:**

Detect `?checkout=success` | `?checkout=cancel` in `AppContent` (existing `useSearchParams` pattern).

**Cancel flow:** Show dismissible banner “Checkout canceled” + link to reopen paywall if `pendingUrl` in sessionStorage.

**Success flow — `checkout_success_pending`:**

1. Show `CheckoutPending` UI: “Payment received. Activating your Pro workspace…”
2. Poll `GET /api/workspaces/subscription` every 2s for up to **60s**
3. On `isProActive` → transition to `RecoverySetup` screen
4. On timeout → “Still syncing…” + refresh button + `supportMailto('Pro activation pending')`
5. Strip `checkout` query param via `router.replace` after handling
6. Analytics: `checkout_success_pending`, `checkout_success_resolved` with `{ resolved: boolean, elapsed_ms }`

**RecoverySetup screen** (modal or full-screen overlay — not blocking entire app forever):

```txt
Your Pro workspace is ready.
Save this private recovery link before crawling your first site.

[Copy recovery link]
[I saved it]
[Do this later]
```

- On mount: call `POST /api/workspaces/recovery-link` if no URL cached in component state
- Copy button: `navigator.clipboard.writeText` with fallback “Select and copy” textarea
- **I saved it:** `trackEvent('recovery_link_confirmed')`; set acknowledged flag; dismiss overlay
- **Do this later:** `trackEvent('recovery_link_deferred')`; dismiss; set `showRecoveryBanner` in app state

**Persistent banner** (until confirmed): in `AppShell` or Settings — “Save your recovery link so you don’t lose Pro access on this device.” → opens RecoverySetup or Settings recovery section.

**Crawl gate (forward-looking for 6d):** Export `needsRecoveryConfirmation()` helper — 6d crawl API checks server-side nothing, but client crawl button disabled until confirmed OR shows recovery nudge. Server cannot enforce “saved recovery” — client + 6d UX only.

**Verification:**

- Manual with Stripe test clock / test card
- Mock poll tests for timeout vs success

---

## 6c.4 — Customer portal + Settings billing state

### Step 9 — Billing portal API

**Files:** `app/api/billing/portal/route.ts`, `lib/billing/portal.ts`

**Work:**

`POST /api/billing/portal` — requires workspace auth + `stripe_customer_id` present.

1. Create Stripe Billing Portal session:

```typescript
stripe.billingPortal.sessions.create({
  customer: workspace.stripe_customer_id,
  return_url: `${getAppUrl()}/app`,
});
```

2. Return `{ url: session.url }`
3. On missing customer / Stripe error → 502 with `{ error, supportEmail }`
4. Analytics: `billing_portal_opened`, `billing_portal_failed`

Rate-limit: 10/hour per workspace.

---

### Step 10 — Settings billing section

**Files:** `app/ui/settings/settings-panel.tsx`, `app/ui/settings/billing-section.tsx`, `hooks/use-subscription.ts`

**Work:**

New `useSubscription(headers)` hook — polls/subscribes to `/api/workspaces/subscription` when settings open or on interval when Pro pending.

**Billing section UI** (when `hasStripeCustomer` or `isProActive`):

- Plan badge: “RagBase Pro” / “Free workspace”
- Period end: “Renews {date}” or “Access until {date}”
- **Manage billing** button → POST portal → `window.location.href = url`
- Recovery link: Copy / Regenerate (calls recovery-link API)
- If `!recoveryLinkConfirmed` → amber banner with save CTA

Free users: no Manage billing; existing content unchanged.

**Verification:**

- Manual: Pro test user → Manage billing opens Stripe portal → cancel → webhook downgrades plan → Settings reflects Free

---

## 6c.5 — Feature-flagged live Payment Link CTA

### Step 11 — Paywall checkout branch

**Files:** `app/ui/upsell/full-site-paywall-dialog.tsx`, `lib/billing/checkout-url.ts`, `lib/billing/__tests__/checkout-url.test.ts`

**Work:**

`getCheckoutState()`:

| Condition | Primary CTA |
|-----------|-------------|
| `!isBillingEnabled()` | Waitlist (current 6a behavior) |
| `isBillingEnabled()` && payment link URL set | **Unlock site crawling** → opens `{PAYMENT_LINK}?client_reference_id={workspaceId}` in same tab |
| Billing enabled but no URL | Disabled button + “Checkout temporarily unavailable” + support mailto |

On subscribe click: `trackEvent('paywall_subscribe_clicked', { checkout_available: true })`.

Add `paywall_subscribe_clicked` to `lib/analytics/types.ts` (reserved in 6a plan).

Update `paywall_viewed` to pass `checkout_available: isBillingEnabled()`.

**Do not** enable flags in production until 6c.6 QA passes.

---

### Step 12 — Pro mismatch guard

**Files:** `lib/billing/subscription-status.ts`, `app/ui/settings/billing-section.tsx`

**Work:**

If user has `stripe_customer_id` but `!isProActive` and status is `past_due` / sync lag > 60s after return:

> Subscription issue — manage billing or contact support.

With Manage billing + `supportMailto`.

---

## 6c.6 — E2E QA

### Step 13 — Tests

**Files:**

- `lib/billing/__tests__/*`
- `lib/workspace/__tests__/recovery.test.ts`
- `e2e/billing-checkout.spec.ts` (optional — may use Stripe test mode manually first)
- `docs/QA_CHECKLIST.md` — new **Billing (phase 6c)** section

**Manual QA checklist (required before enabling flags):**

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Test-mode checkout with `client_reference_id` | Webhook fires; workspace `plan=pro`, subscription fields set |
| 2 | Return before webhook | Pending UI → resolves within 60s |
| 3 | Return after 60s no webhook | Timeout message + support mailto |
| 4 | Recovery link copy | URL works in fresh browser/profile |
| 5 | Expired recovery token | Generic error, no leak |
| 6 | Customer Portal | Cancel subscription → `subscription.deleted` → downgrade |
| 7 | `invoice.payment_failed` | past_due; Pro access for 3 days then downgrade on canceled |
| 8 | Feature flags off | Paywall shows waitlist only |
| 9 | Flags on after QA | Payment Link opens with correct workspace id |
| 10 | Idempotent webhook | Replay same event id → no double-write |

**Rollout (production):**

```txt
1. Deploy with STRIPE_WEBHOOKS_ENABLED=false, NEXT_PUBLIC_BILLING_ENABLED=false
2. Configure Stripe test webhook on preview URL → run QA 1–7
3. STRIPE_WEBHOOKS_ENABLED=true on preview → re-run QA
4. One live $1 test price checkout (if using live mode)
5. NEXT_PUBLIC_BILLING_ENABLED=true
6. Monitor webhook errors + PostHog funnel 24h
```

**Verification:**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

## File summary

| Action | Path |
|--------|------|
| New | `supabase/migrations/*_billing_pro.sql` |
| New | `lib/billing/flags.ts`, `types.ts`, `pro-plan.ts`, `errors.ts`, `webhook-handlers.ts`, `downgrade-workspace.ts`, `subscription-status.ts`, `portal.ts`, `checkout-url.ts` |
| New | `lib/stripe/client.ts` |
| New | `lib/support.ts` |
| New | `lib/workspace/recovery.ts` |
| New | `app/api/webhooks/stripe/route.ts` |
| New | `app/api/workspaces/subscription/route.ts` |
| New | `app/api/workspaces/recovery-link/route.ts` |
| New | `app/api/workspaces/recover/route.ts` |
| New | `app/api/billing/portal/route.ts` |
| New | `app/app/recover/page.tsx` |
| New | `app/ui/billing/checkout-pending.tsx`, `recovery-setup.tsx`, `recovery-banner.tsx` |
| New | `app/ui/settings/billing-section.tsx` |
| New | `hooks/use-checkout-return.ts`, `hooks/use-subscription.ts` |
| New | `lib/billing/__tests__/*`, `lib/workspace/__tests__/recovery.test.ts` |
| Modify | `lib/workspace/auth.ts` (billing field selects where needed) |
| Modify | `lib/site.ts` (if support helpers stay separate) |
| Modify | `lib/analytics/types.ts` |
| Modify | `lib/rate-limit/config.ts` |
| Modify | `app/ui/upsell/full-site-paywall-dialog.tsx` |
| Modify | `app/ui/app.tsx` |
| Modify | `app/ui/settings/settings-panel.tsx` |
| Modify | `.env.example` |
| Modify | `docs/QA_CHECKLIST.md` |
| Update | `docs/workspace-recovery.md` — mark implemented, point to this plan |

---

## Success criteria (6c done)

1. Test-mode Payment Link checkout activates Pro on correct workspace via webhook.
2. User returning from checkout sees pending → recovery flow (not a dead end).
3. Recovery link restores workspace in a fresh browser.
4. Settings shows Pro state + **Manage billing** → Stripe Customer Portal works.
5. Subscription cancel downgrades workspace; data retained.
6. `NEXT_PUBLIC_BILLING_ENABLED=false` keeps waitlist-only paywall.
7. Support mailto appears on pending sync failure, portal failure, recovery failure.
8. `npm run lint`, `npm test`, `npm run build` pass.
9. QA checklist rows 1–10 signed off before production flags enabled.

---

## After 6c

Proceed to **Phase 6d** (Pro-gated crawl API + bundled source UI) per roadmap. Waitlist → Pro email only after 6c QA gate (roadmap step 10).
