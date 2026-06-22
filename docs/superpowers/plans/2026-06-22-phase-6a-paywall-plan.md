# Implementation Plan — Phase 6a: Paywall + Root URL Choice + Waitlist

**Spec:** [2026-06-22-ocr-and-crawl-design.md](../specs/2026-06-22-ocr-and-crawl-design.md)  
**Date:** 2026-06-22  
**Scope:** Paid-intent surface only — no OCR, no Stripe webhooks, no crawl API

## Solution approach

Replace the “coming soon” crawl teaser with a Pro paywall dialog and a root-URL choice flow. Single-page URL ingestion stays unchanged. Waitlist emails persist in Supabase; PostHog captures funnel events only. Stripe checkout CTA remains hidden or waitlist-only until phase 6c — this phase validates demand before backend cost.

## Out of scope (explicit)

- OCR pipeline (6b)
- Stripe webhooks / subscription columns (6c)
- Crawl API / Firecrawl jobs (6d)
- Live Payment Link checkout button (wait until 6c QA gate)

---

## Step 1 — App URL helper & env

**Files:** `lib/site.ts`, `app/lib/site.ts` (re-export if needed), `.env.example`

**Work:**

- Add `getAppUrl()` reading `NEXT_PUBLIC_APP_URL` (default `https://www.ragbase.dev`, no trailing slash).
- Deprecate or alias `getSiteUrl()` → prefer `getAppUrl()` for recovery/return URLs; keep `NEXT_PUBLIC_SITE_URL` as fallback for SEO/metadata if already used.
- Document env vars:

```txt
NEXT_PUBLIC_APP_URL=https://www.ragbase.dev
NEXT_PUBLIC_PRO_PRICE_DISPLAY=$9/mo
# Stripe URLs documented but unused in 6a UI:
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=
NEXT_PUBLIC_STRIPE_SUCCESS_URL=
NEXT_PUBLIC_STRIPE_CANCEL_URL=
```

**Verification:**

```bash
npm run typecheck
```

- Unit test: `getAppUrl()` strips trailing slash, respects env override.

---

## Step 2 — Waitlist migration

**Files:** `supabase/migrations/YYYYMMDD_waitlist_emails.sql`

**Work:**

```sql
CREATE TABLE waitlist_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_emails_email_feature_idx
  ON waitlist_emails (lower(email), feature);
```

- RLS: service role only (API route uses service client, same as workspaces).
- No client direct access.
- **Verify:** `workspaces.id` is `uuid` (confirmed in `20260622153508_initial.sql`) — `workspace_id uuid REFERENCES workspaces(id)`.

**Verification:**

```bash
supabase db lint
# or apply migration on dev project
```

---

## Step 3 — Waitlist API route

**Files:** `app/api/waitlist/route.ts`, `lib/waitlist.ts` (Zod schema)

**Work:**

- `POST /api/waitlist` body: `{ email, feature: 'full_site_crawl', source?, website?, formOpenedAt? }`
- Optional header: workspace ID if client has credentials (store nullable FK).
- Validate email with Zod; normalize lowercase.
- **Bot protection (no CAPTCHA):**
  - `website` honeypot field — if non-empty, return `{ success: true }` silently (no DB write).
  - Minimum submit delay: 800ms from `formOpenedAt` to server receive time.
  - IP rate limit via existing rate-limit module.
  - Unique index on `(lower(email), feature)` — duplicate returns success, one row.
- Insert into `waitlist_emails`; on duplicate `(email, feature)` return 200 anyway (no enumeration).
- **Analytics:** fire `paywall_waitlist_submitted` with `feature` and `source` only — **never email** (not even hashed).
- Return `{ success: true }`.

**Verification:**

- Jest/API test: valid email inserts row; duplicate is idempotent; invalid email → 400.

---

## Step 4 — Analytics event types

**Files:** `lib/analytics/types.ts`, `lib/analytics/__tests__/events.test.ts`

**Work:**

Add events:

```txt
paywall_viewed
paywall_primary_clicked      # 6a: waitlist/notify CTA (not Stripe)
paywall_waitlist_submitted
```

Reserve `paywall_subscribe_clicked` for phase 6c when live Stripe checkout ships.

Keep existing `paid_intent` / `paid_feature_clicked` for `full_site_crawl`.

Properties (sanitized): `surface`, `has_pending_url`, `checkout_available` (boolean — false in 6a). **No email in any analytics event.**

**Verification:**

```bash
npm test -- lib/analytics/__tests__/events.test.ts
```

---

## Step 5 — `FullSitePaywallDialog` component

**Files:** `app/ui/upsell/full-site-paywall-dialog.tsx` (new), delete or deprecate `crawl-teaser.tsx`

**Work:**

- Shadcn `Dialog` matching existing dark theme.
- Props: `open`, `onOpenChange`, `pendingUrl?: string`, `onAddPageOnly?: () => void`
- Copy per spec §3 (headline, bullets, Pro price from `NEXT_PUBLIC_PRO_PRICE_DISPLAY`, recovery note).
- **Primary CTA — 6a behavior:**
  - Inline email field + “Notify me” → `POST /api/waitlist`
  - Do **not** open Stripe Payment Link in 6a (even if env set — show subcopy “Checkout opening soon” or hide subscribe until 6c)
- **Secondary CTA:** “Add this page only” → `onAddPageOnly()` then close.
- On open: `trackEvent('paywall_viewed', ...)`.
- On primary CTA click: `trackEvent('paywall_primary_clicked', ...)`.
- On waitlist submit success: `trackEvent('paywall_waitlist_submitted', ...)` (client); server analytics mirrors without email.
- Success state: “You're on the list — we'll email you when site crawling launches.”

**Verification:**

- RTL snapshot or behavior test: dialog renders copy; submit calls API mock.

---

## Step 6 — `UrlIngestChoiceDialog` component

**Files:** `app/ui/home/url-ingest-choice-dialog.tsx` (new)

**Work:**

- Shown **only** when user submits a true root/homepage URL (`isRootUrl` — pathname `/` with no query).
- **Show dialog:** `https://example.com/`, `https://example.com`, `https://docs.example.com/`
- **Skip dialog (direct ingest):** `https://example.com/pricing`, `https://example.com/blog/post`, `https://docs.example.com/getting-started`
- Two actions:
  1. **Add this page only** → callback `onSinglePage(url)` → existing `handleUrlSubmit` path
  2. **Crawl entire site** → callback `onCrawlSite(url)` → open paywall with `pendingUrl`
- Brief explainer: single page is free; full site requires Pro.
- Accessible: focus trap, keyboard, `aria-labelledby`.

**Verification:**

- Unit test: `isRootUrl` triggers dialog; non-root skips dialog.

---

## Step 7 — Wire URL flow in `app.tsx`

**Files:** `app/ui/app.tsx`, `app/ui/home/url-input.tsx` (minimal)

**Work:**

- Add state: `urlChoiceOpen`, `pendingRootUrl`, `paywallOpen`, `paywallPendingUrl`.
- New handler `handleUrlSubmitWithChoice`:
  1. If `isRootUrl(url)` → set `pendingRootUrl`, open `UrlIngestChoiceDialog`, return.
  2. Else → existing `handleUrlSubmit(url)`.
- `onSinglePage` from choice dialog → `handleUrlSubmit(pendingRootUrl)`.
- `onCrawlSite` → open `FullSitePaywallDialog` with URL; track `paid_intent`.
- Replace all `CrawlTeaser` imports/usages with `FullSitePaywallDialog`.
- `openCrawlTeaser` rename → `openFullSitePaywall` (hint link, no URL).

**Verification:**

- Manual: paste `https://example.com/` → choice dialog → “Add this page only” ingests.
- Manual: choice → “Crawl entire site” → paywall with URL shown.

---

## Step 8 — Update hint & copy

**Files:**

- `app/ui/home/crawl-teaser-hint.tsx` → rename to `full-site-crawl-hint.tsx` or update in place
- `lib/ingestion/user-errors.ts`

**Work:**

- Hint copy: “Need an entire website?” + link **“Crawl an entire site”** (not “coming soon”).
- `ROOT_URL_INGESTION_NOTICE`: “Only this page was added. Unlock site crawling with RagBase Pro to read the whole site.”
- Update `getIngestionRecoveryAction` scanned_pdf copy only if still saying “coming soon” — **defer OCR copy to 6b** (do not change scanned PDF recovery in 6a unless trivial).

**Verification:**

- Grep: no “coming soon” in crawl hint/paywall paths.

---

## Step 9 — Layout integration

**Files:** `app/ui/layout/app-shell.tsx`, `app/ui/home/landing-home.tsx`

**Work:**

- Pass `onCrawlTeaserOpen` → `onFullSitePaywallOpen` (prop rename optional).
- Ensure hint appears in both landing and sidebar URL sections.
- Mount `UrlIngestChoiceDialog` + `FullSitePaywallDialog` once at `AppContent` level (same as current `CrawlTeaser` placement).

**Verification:**

- Mobile + desktop: hint visible; dialogs not clipped by overflow.

---

## Step 10 — QA checklist & docs

**Files:** `docs/QA_CHECKLIST.md`

**Work:**

Add rows:

| Scenario | Expected |
|----------|----------|
| Crawl hint click | Paywall opens; `paywall_viewed` fires |
| Waitlist submit | Email in `waitlist_emails`; success message |
| Duplicate waitlist email | Submit same email twice → success both times, one DB row |
| Root URL → single page | Ingests one page; Pro notice in response |
| Root URL → crawl | Paywall opens; no ingest |
| Non-root URL | No choice dialog; direct ingest |

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
| New | `supabase/migrations/*_waitlist_emails.sql` |
| New | `app/api/waitlist/route.ts` |
| New | `lib/waitlist.ts` |
| New | `lib/site.ts` |
| New | `app/ui/upsell/full-site-paywall-dialog.tsx` |
| New | `app/ui/home/url-ingest-choice-dialog.tsx` |
| New | `lib/__tests__/site.test.ts` |
| New | `lib/__tests__/waitlist.test.ts` |
| Modify | `app/lib/site.ts` |
| Modify | `app/ui/app.tsx` |
| Modify | `app/ui/home/crawl-teaser-hint.tsx` |
| Modify | `lib/ingestion/user-errors.ts` |
| Modify | `lib/analytics/types.ts` |
| Modify | `.env.example` |
| Modify | `docs/QA_CHECKLIST.md` |
| Remove | `app/ui/upsell/crawl-teaser.tsx` (after replacement) |

---

## Success criteria (6a done)

1. No “coming soon” for site crawling in user-facing UI.
2. Root URL users choose single-page vs crawl; crawl opens paywall.
3. Waitlist emails stored in Supabase, not PostHog-only.
4. Analytics funnel: viewed → waitlist submitted (+ existing paid_intent).
5. Single-page URL ingest behavior unchanged for non-root URLs.
6. No Stripe checkout exposed until 6c.
7. Build, lint, tests pass.

---

## Next phase

**6b — OCR pipeline** per spec §7 (only after 6a shipped and paywall funnel reviewed in PostHog).
