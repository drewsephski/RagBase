# Handoff — Phase 6c → 6d

**Date:** 2026-06-23  
**Status:** 6c implemented locally (uncommitted at handoff time); 6d not started  
**Product:** RagBase — Instant Document Brain

## Read first

| Doc | Purpose |
|-----|---------|
| [Feature roadmap spec](../specs/2026-06-23-feature-roadmap-design.md) | Approved priorities and scope boundaries |
| [Phase 6c plan](../plans/2026-06-23-phase-6c-stripe-recovery-plan.md) | What 6c was supposed to ship |
| [OCR/crawl design spec](../specs/2026-06-22-ocr-and-crawl-design.md) | Authoritative for 6d crawl API + data model |
| [QA checklist](../../QA_CHECKLIST.md) | § Billing and recovery (phase 6c) |

## What’s done (Phase 6c)

Billing foundation is coded but **not production-enabled**. Feature flags default to off.

### Backend
- Migration: `supabase/migrations/20260623100000_billing_pro.sql`
- Stripe webhook: `app/api/webhooks/stripe/route.ts` (requires `STRIPE_WEBHOOKS_ENABLED=true`)
- Subscription status: `GET /api/workspaces/subscription`
- Recovery: `POST /api/workspaces/recovery-link`, `POST /api/workspaces/recover`, `POST /api/workspaces/recovery-acknowledge`
- Billing portal: `POST /api/billing/portal`
- Domain logic: `lib/billing/*`, `lib/workspace/recovery.ts`, `lib/stripe/client.ts`

### Frontend
- Checkout return polling + pending UI: `hooks/use-subscription.ts`, `app/ui/billing/checkout-pending.tsx`
- Recovery setup (Copy / I saved it / Do this later): `app/ui/billing/recovery-setup.tsx`, banner in `app-shell.tsx`
- Settings billing: `app/ui/settings/billing-section.tsx`
- Paywall checkout branch: `app/ui/upsell/full-site-paywall-dialog.tsx` (when `NEXT_PUBLIC_BILLING_ENABLED=true`)
- Recover page: `/app/recover?token=…`

### Tests
- `lib/billing/__tests__/*`, `lib/workspace/__tests__/recovery.test.ts`
- `npm run typecheck` ✅ · `npm test` ✅ (144 tests)

## What the next agent should do (in order)

### 1. Commit + apply migration (if not done)
- Review uncommitted 6c diff; commit with clear message.
- Apply `20260623100000_billing_pro.sql` to dev Supabase.

### 2. Complete 6c QA before enabling flags
Do **not** set `NEXT_PUBLIC_BILLING_ENABLED=true` until webhook E2E passes.

```bash
# Stripe CLI (test mode)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Checklist (see QA doc):
- Test checkout with `client_reference_id={workspaceId}` activates Pro
- Checkout return pending → resolves within 60s
- Recovery link works in fresh browser/profile
- Customer Portal cancel → `subscription.deleted` downgrades workspace
- `invoice.payment_failed` → `past_due` with 3-day grace (`lib/billing/pro-plan.ts`)

Rollout order:
1. `STRIPE_WEBHOOKS_ENABLED=true`
2. Manual test checkout + recovery + portal
3. `NEXT_PUBLIC_BILLING_ENABLED=true`

### 3. Implement Phase 6d — Pro-gated crawl
**Blocked on 6c QA**, but code can be developed behind `requireProPlan()`.

From OCR/crawl spec §5–6:

| Item | Notes |
|------|-------|
| `POST /api/sources/crawl` | Async Firecrawl job; call `requireProPlan()` from `lib/billing/pro-plan.ts` |
| Crawl usage enforcement | Env: `CRAWL_MAX_*`; counters on `workspaces` already in migration |
| Bundled source UI | One crawl source, expandable page list |
| Progress + partial failure UX | Staged status, cancel endpoint |
| Crawl quota in Settings | `2/3 crawls`, pages/period — extend `billing-section.tsx` |

**Do not** ship waitlist → Pro email until 6c QA gate passes (roadmap step 10).

## Env vars (required for 6c runtime)

```txt
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_WEBHOOKS_ENABLED=false          # flip after webhook QA
NEXT_PUBLIC_BILLING_ENABLED=false        # flip after full 6c QA
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=
NEXT_PUBLIC_SUPPORT_EMAIL=support@ragbase.dev
RECOVERY_TOKEN_PEPPER=                   # long random string — required for recovery
FIRECRAWL_API_KEY=                       # needed for 6d
```

See `.env.example` for full list.

## Important implementation notes

1. **Recovery rotates secret** — `exchangeRecoveryToken()` generates a new workspace secret; old browser sessions invalidate. Documented in `lib/workspace/recovery.ts`.
2. **Stripe SDK v22** — Subscription period fields live on **items**, not top-level. Use `lib/billing/stripe-subscription.ts` helpers.
3. **Webhook idempotency** — `stripe_webhook_events` table; duplicate event IDs return 200.
4. **Pro check** — `isProActive()` allows `active`, `trialing`, and `past_due` within 3-day grace.
5. **Paywall** — Waitlist remains default until both flags + Payment Link URL are set.
6. **Build** — `npm run build` may fail on pre-existing ESLint `require()` issues in `lib/openrouter/client.ts` and `lib/rate-limit/store.ts` (not introduced by 6c).

## Key files for 6d

```
lib/ingestion/          # existing URL ingest; add crawl job orchestration
app/api/sources/        # new crawl + cancel routes
app/ui/sources/         # bundled crawl source UI
lib/billing/pro-plan.ts # gate crawl API
hooks/use-ingestion.ts  # wire root URL → crawl for Pro users
```

## Explicitly out of scope (next agent)

- Template-aware paywall copy
- Waitlist launch email
- Email-based recovery via checkout email
- Document-aware starters / Phase 2 UX
- Full user accounts / login

## Success criteria

**6c done:** Test-mode subscribe → Pro active → recovery saved → portal works → flags enabled safely.

**6d done:** Pro user pastes root URL → crawls site → chats with cross-page citations → quota visible in Settings.

## Questions already decided

- Payment Link + `client_reference_id` (not Checkout Sessions API migration)
- Recovery gate is strong but not a hard app block (“Do this later” allowed)
- 6c narrow scope; crawl quota UI ships with 6d, not 6c
