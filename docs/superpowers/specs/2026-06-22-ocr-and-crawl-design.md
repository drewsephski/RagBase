# OCR + Full-Site Crawl — Design Spec

**Status:** Approved  
**Date:** 2026-06-22  
**Product:** RagBase — Instant Document Brain

## Summary

Ship two promised capabilities in one release:

1. **OCR for scanned PDFs** — free with tight caps; extended limits when the user supplies an OpenRouter key for vision OCR only.
2. **Full-site crawl** — Pro subscription only; single-page URL ingestion stays free and unchanged.

Monetization uses a hybrid paywall: Stripe Payment Link when configured, email waitlist otherwise. Anonymous workspaces remain the default; Pro requires billing state, usage limits, and a paid workspace recovery path.

---

## Goals

| Goal | Success criteria |
|------|------------------|
| End scanned-PDF dead ends | Low-text PDFs OCR within tier caps; clear errors when over cap |
| Monetize full-site crawl | Pro-only crawl; single-page URLs remain free |
| No-auth subscription works | Stripe webhooks activate Pro; recovery link restores access after localStorage loss |
| Cost control | OCR and crawl caps enforced **before** provider calls |
| Consumer UX | No developer jargon; clear paywall and recovery copy |

## Non-goals (this release)

- Full user accounts / login
- BYOK unlocking crawl or server-side Firecrawl OCR
- Payments for OCR (OCR stays free-with-caps / BYOK vision only)
- Crawl beyond configured depth/page/billing-period limits

---

## Locked product decisions

| Area | Decision |
|------|----------|
| OCR access | Free up to 10 pages (server Firecrawl); BYOK vision OCR up to 50 pages with explicit UI disclosure |
| Crawl access | Pro subscription only (`plan === 'pro'` + active/trialing subscription) |
| Single-page URL | Unchanged — existing `/api/sources/url`, free for all users |
| Crawl UI | One bundled source with expandable page list |
| Crawl entry | Hint link + root-URL choice dialog → paywall for “crawl entire site” |
| Paywall | Hybrid — Stripe Payment Link if env set; waitlist fallback in phase 6a |
| BYOK scope | Model choice, LLM message limits, vision OCR pages via user key — **not** crawl, retention, hosted Firecrawl OCR, or large doc-count bypass |

---

## 1. Billing & subscription state

### Problem

Setting `workspace.plan = 'pro'` alone is insufficient. Subscriptions cancel, fail, and renew. Pro access must reflect live Stripe subscription state.

### Schema changes — `workspaces`

Extend the existing table:

```sql
-- plan enum: replace paid_future with pro where appropriate
plan text NOT NULL DEFAULT 'anonymous'
  CHECK (plan IN ('anonymous', 'free', 'pro'))

stripe_customer_id text
stripe_subscription_id text
stripe_subscription_status text
  -- e.g. active, trialing, past_due, canceled, unpaid
stripe_current_period_start timestamptz
stripe_current_period_end timestamptz
pro_activated_at timestamptz

-- Crawl usage (reset each billing period)
crawl_count_period integer NOT NULL DEFAULT 0
crawled_pages_period integer NOT NULL DEFAULT 0
crawl_period_start timestamptz  -- mirrors stripe_current_period_start for usage window
```

Indexes: `stripe_customer_id`, `stripe_subscription_id` (unique where not null).

### `requireProPlan(workspace)`

Pro crawl is allowed only when **all** of the following are true:

```txt
workspace.plan === 'pro'
AND workspace.stripe_subscription_status IN ('active', 'trialing')
AND (stripe_current_period_end IS NULL OR stripe_current_period_end > now())
```

Return `403` with paywall-friendly message if not Pro.

### Stripe Payment Link

Use Payment Link URL parameter:

```txt
?client_reference_id={workspaceId}
```

Stripe sends `client_reference_id` on `checkout.session.completed`, enabling anonymous workspace reconciliation without accounts.

**Env vars:**

```txt
NEXT_PUBLIC_APP_URL=https://www.ragbase.dev   # no trailing slash; used for recovery + return URLs
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=          # optional; omit until webhook tested
NEXT_PUBLIC_PRO_PRICE_DISPLAY=$9/mo           # display only
NEXT_PUBLIC_STRIPE_SUCCESS_URL=               # e.g. ${NEXT_PUBLIC_APP_URL}/app?checkout=success
NEXT_PUBLIC_STRIPE_CANCEL_URL=                # e.g. ${NEXT_PUBLIC_APP_URL}/app?checkout=cancel
STRIPE_WEBHOOK_SECRET=
```

`NEXT_PUBLIC_STRIPE_SUCCESS_URL` and `NEXT_PUBLIC_STRIPE_CANCEL_URL` may also be configured directly in the Stripe Payment Link dashboard; if so, document the chosen URLs in deployment notes. The app must handle the success return path regardless (see §2).

**Post-checkout return flow:**

```txt
Checkout complete
→ user returns to RagBase (success URL)
→ app polls workspace subscription status
→ Pro detected
→ recovery link screen shown
```

**Rule:** Do not show a live “Unlock site crawling” checkout CTA until phase 6c (webhook + plan activation) is tested end-to-end. Phase 6a paywall shows waitlist when Stripe URL is unset, or a disabled/“coming soon” checkout state if URL is set but webhooks are not live.

### Webhook handler — `POST /api/webhooks/stripe`

Verify signature with `STRIPE_WEBHOOK_SECRET`. Handle at minimum:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Read `client_reference_id` → workspace ID; store `stripe_customer_id`, `stripe_subscription_id`, set `plan = 'pro'`, `pro_activated_at`, subscription status, `stripe_current_period_start`, `stripe_current_period_end`; reset crawl period counters to align with new billing period |
| `customer.subscription.updated` | Sync `stripe_subscription_status`, `stripe_current_period_start`, `stripe_current_period_end`; reset crawl counters when period rolls over; downgrade if status not in active/trialing |
| `customer.subscription.deleted` | Set `plan = 'anonymous'` (or `free`), clear subscription fields, retain workspace data |
| `invoice.payment_failed` | Update status to `past_due`; optionally grace period before downgrade (document decision: 3-day grace, then downgrade) |

Idempotent processing keyed by Stripe event ID (store processed event IDs or use Stripe idempotency).

### Crawl usage enforcement

Before starting a crawl, check:

```txt
active_crawl_count < CRAWL_MAX_ACTIVE_PER_WORKSPACE (1)
AND crawl_count_period < CRAWL_MAX_CRAWLS_PER_PERIOD (3)
AND crawled_pages_period + requested_pages <= CRAWL_MAX_PAGES_PER_PERIOD (75)
```

Increment `crawl_count_period` on crawl start; increment `crawled_pages_period` by successfully ingested pages on completion. Reset counters when `stripe_current_period_start` advances (compare stored `crawl_period_start` against Stripe’s current period start on webhook sync).

### Crawl attempt counting rules

| Outcome | Count crawl attempt? | Count pages? |
|---------|---------------------|--------------|
| User-caused failure (invalid URL, blocked site, over limit) | Yes | No |
| Provider/internal failure (Firecrawl outage, timeout before pages) | No | No |
| Partial success | Yes | Successful pages only |
| Canceled by user | Yes if Firecrawl job already started; otherwise No | Successful pages only (if any) |
| Full success | Yes | All ingested pages |

If a crawl fails before any pages are ingested due to a provider/internal error, do **not** increment `crawl_count_period` — otherwise users could exhaust retries on outages, or retry expensive crawls forever on user errors without counting attempts.

---

## 2. Paid workspace recovery (required)

### Problem

Anonymous Pro users who clear localStorage or switch devices lose workspace credentials and perceive payment as broken.

### Minimum viable recovery (ship with payment)

**Post-checkout screen** (redirect or in-app after polling detects Pro):

> Pro is attached to this private workspace. Save your recovery link to access it later.

Recovery link format (use env, never hard-code domain):

```txt
${NEXT_PUBLIC_APP_URL}/app/recover?token={opaque_token}
```

Example: `https://www.ragbase.dev/app/recover?token=...`

**Do not put the raw `workspaceSecret` in the token**, even if HMAC-signed. Use an opaque server-issued token:

```txt
Token URL param: opaque random token (e.g. 32+ bytes, base64url)
Server stores: recovery_token_hash, workspace_id, expires_at, created_at, last_used_at
```

Table `workspace_recovery_tokens`:

```sql
CREATE TABLE workspace_recovery_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
```

Recovery flow:

1. `POST /api/workspaces/recovery-link` (workspace auth) → generate opaque token, store hash, return full URL using `getAppUrl()`.
2. `GET /app/recover?token=...` → validate hash, check expiry, return workspace credentials to client (restore localStorage), mark `last_used_at`.
3. Revocation: delete token row or rotate on demand.

Implementation:

1. **On client:** after checkout success URL, poll workspace plan; when Pro, call recovery-link endpoint → show URL once.
2. **Optional:** pre-create token on webhook for audit; still show link in-app after return.

### Better version (follow-up or parallel)

Email-based recovery without full auth:

> Enter the email you used at checkout and we’ll send your workspace recovery link.

- Store `stripe_checkout_email` on workspace from checkout session.
- `POST /api/workspaces/recover-request` { email } → if match, send recovery link (Resend/SendGrid).
- Rate-limit and do not confirm whether email exists (security).

**Paywall copy (always visible when Pro is discussed):**

> Pro is attached to this private workspace. Save your recovery link to access it later.

---

## 3. Full-site paywall dialog

Replace `CrawlTeaser` with `FullSitePaywallDialog`.

### Triggers

1. User clicks **“Crawl an entire site”** hint under URL field (replaces “coming soon”).
2. User pastes a root URL → `UrlIngestChoiceDialog` → **“Crawl entire site”** opens paywall.

### Copy

| Element | Text |
|---------|------|
| Headline | Read an entire website |
| Value | Crawl docs sites, policy hubs, vendor portals; one source with page list; cited answers across pages |
| Free contrast | Single pages stay free — paste any article or doc link anytime |
| Plan | RagBase Pro · $9/mo (from env display) — up to 25 pages per crawl |
| Primary CTA | **Unlock site crawling** |
| Subcopy on CTA | RagBase Pro · $9/mo |
| Secondary CTA | **Add this page only** |
| Recovery note | Pro is attached to this private workspace. Save your recovery link to access it later. |

### CTA behavior

| Condition | Primary button |
|-----------|----------------|
| Stripe URL unset OR webhooks not live | Waitlist email inline → `paywall_waitlist_submitted` |
| Stripe URL set AND webhooks tested | Open `{PAYMENT_LINK}?client_reference_id={workspaceId}` |
| User returns from checkout | Poll workspace; show recovery link screen on Pro activation |

### Analytics events

- `paywall_viewed`
- `paywall_subscribe_clicked`
- `paywall_waitlist_submitted`
- `paid_intent` / `paid_feature_clicked` with `feature: full_site_crawl`
- `recovery_link_generated`
- `recovery_link_used`

---

## 4. URL flow (single-page unchanged)

### Unchanged

`POST /api/sources/url` — single-page scrape via Firecrawl, same as today.

### New — `UrlIngestChoiceDialog`

Shown only when `isRootUrl(url)`:

| Action | Behavior |
|--------|----------|
| **Add this page only** | Existing single-page ingest |
| **Crawl entire site** | Open paywall (no crawl API until Pro) |

Update `ROOT_URL_INGESTION_NOTICE`:

> Only this page was added. Unlock site crawling with RagBase Pro to read the whole site.

---

## 5. Crawl data model

### Principle

**One bundled source in UI; one document per crawled page in DB.**

Do not merge all pages into a single `documents` row.

### `sources` (crawl)

```txt
type: url
name: "{host} ({N} pages)" 
status: pending | processing | ready | error
metadata:
  mode: crawl
  crawlRoot: https://docs.example.com/
  pageCount: number
  firecrawlJobId: string
  crawlStatus: queued | crawling | indexing | ready | failed | canceled
  failedPageCount: number (optional)
  crawlConfig: { maxDepth, maxPages, ... }
```

### `documents` (per page) — migration

Add columns for crawl pages (nullable for file/single-url sources):

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status text
  CHECK (status IN ('pending', 'processing', 'ready', 'error'));
```

Each crawled page → one `documents` row linked to the crawl `source_id`.

### `chunks`

Existing columns plus (migration as needed):

```txt
source_id uuid          -- denormalized for retrieval filters
page_title text         -- nullable
metadata jsonb          -- e.g. crawl path, firecrawl page id
source_location: page URL
```

### Retrieval

Extend `match_chunks` (or add `filter_document_id`) so **“ask only this page”** scopes to `document_id` without hacking `source_scope` on the source alone.

### UI — bundled source

`SourceItem` for crawl sources:

- Collapsed: site name + page count + crawl status
- Expanded: list of pages (title + path); click page → scope chat to that `document_id`
- Progress states map from `metadata.crawlStatus`:

| Internal | User-facing |
|----------|-------------|
| queued | Starting crawl… |
| crawling | Reading pages… (show `{n}/{max}` if available) |
| indexing | Indexing site… |
| ready | Ready |
| failed | Could not crawl this site |
| canceled | Crawl canceled |

### Partial success

If Firecrawl returns partial results:

- Ingest all successful pages as `documents` with `status = ready`
- Mark failed pages with `status = error` or skip with count in `metadata.failedPageCount`
- Source → `ready` if ≥1 page indexed; show notice: “{N} pages could not be read”
- Bill `crawled_pages_period` only for successfully ingested pages

### Crawl API — `POST /api/sources/crawl`

Requires `requireProPlan()`. Body: `{ url: string }`.

1. Validate URL, check billing-period limits, check no active crawl
2. Create `sources` row (`mode: crawl`, `crawlStatus: queued`)
3. Start Firecrawl `/crawl` with explicit limits (see §6)
4. Return source ID; client polls existing status route
5. Background worker / cron polls Firecrawl crawl status → ingests pages → embeds → updates `crawlStatus`

Include cancel endpoint: `POST /api/sources/{id}/crawl/cancel` → Firecrawl cancel if supported; set `crawlStatus: canceled`.

---

## 6. Crawl limits & Firecrawl config

### Environment defaults

```txt
CRAWL_MAX_DEPTH=2
CRAWL_MAX_PAGES=25
CRAWL_MAX_ACTIVE_PER_WORKSPACE=1
CRAWL_MAX_CRAWLS_PER_PERIOD=3
CRAWL_MAX_PAGES_PER_PERIOD=75
```

### Firecrawl `/crawl` request

Pass explicitly (per Firecrawl docs):

```txt
limit: CRAWL_MAX_PAGES (25)
maxDepth: CRAWL_MAX_DEPTH (2)
includePaths / excludePaths: optional v2 enhancement
scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
```

Poll Firecrawl crawl status endpoint until complete, failed, or timeout. Store `firecrawlJobId` in source metadata for debugging and cancel.

---

## 7. OCR pipeline

### Provider strategy

| Tier | Provider | Cap | Cost bearer |
|------|----------|-----|-------------|
| Free (no BYOK) | Firecrawl document parsing (`mode: ocr` or `auto`) | 10 pages | Server (Firecrawl) |
| BYOK | OpenRouter vision model on rendered PDF pages | 50 pages | User’s OpenRouter key |

**BYOK does not increase server Firecrawl OCR pages.** BYOK only unlocks vision OCR path using the client-supplied key (sent per-request for OCR action only, same pattern as chat).

### Hard rule — cost gate

```txt
Never OCR more pages than the tier allows before calling the OCR provider.
```

Flow:

1. Parse PDF with `pdf-parse` (existing).
2. If `detectLowTextPdf()`:
   a. Count pages (`checkPdfPages` still applies).
   b. Resolve cap: 10 (free) or 50 (BYOK vision).
   c. If `pageCount > cap` → **error immediately**; do not call Firecrawl or vision.
   d. If within cap → set source `processing`, message “Reading scanned pages…”.
   e. Run OCR on pages 1..min(pageCount, cap).
   f. Continue chunk → embed → ready.
3. Track analytics: `ocr_attempted`, `ocr_completed`, `ocr_failed` (properties: page_count, tier, provider).

### UI copy (BYOK)

In Settings near OpenRouter key and on OCR upsell errors:

> OCR for larger scans will use your OpenRouter key.

### Error recovery

Update `scanned_pdf` recovery text from “coming soon” to actionable guidance (export text PDF, add key for larger scans, split document).

### Reprocess

Reprocess retries OCR path for previously failed scanned PDFs.

---

## 8. BYOK boundary (explicit)

BYOK **may** increase:

- Chat model selection
- Daily LLM message limit (existing: 200 vs 30)
- Vision OCR page cap (50 vs 10) using **user’s** OpenRouter key

BYOK **must not** increase:

- Full-site crawl access (Pro only)
- Server-side Firecrawl OCR page allowance beyond free 10
- Storage retention (14 days)
- `MAX_SOURCES` (5) materially
- Crawl billing-period limits

Server routes ignore client BYOK for crawl authorization and Firecrawl OCR quota.

---

## 9. Implementation phasing

```txt
6a — Paywall dialog + URL choice + waitlist fallback + analytics + copy updates
     (No live Stripe checkout button until 6c verified)

6b — OCR pipeline + cost gate + recovery UX + ocr_* analytics

6c — Stripe webhook + subscription state columns + requireProPlan()
     + recovery link generation + post-checkout recovery screen
     (Enable live Payment Link CTA only after this phase passes QA)

6d — Crawl API + Firecrawl async + per-page documents + bundled source UI
     + billing-period crawl counters + partial failure handling
```

### Phase 6a deliverables

- `FullSitePaywallDialog` replaces `CrawlTeaser`
- `UrlIngestChoiceDialog` for root URLs
- `CrawlTeaserHint` → “Crawl an entire site”
- Waitlist email capture in Supabase `waitlist_emails` (PostHog events only for analytics, not lead storage)
- Analytics wired
- Stripe CTA hidden or waitlist-only until 6c

### Phase 6c QA gate (before live checkout)

- [ ] Test Payment Link with `client_reference_id`
- [ ] Webhook activates Pro on test workspace
- [ ] `requireProPlan()` passes only with active subscription
- [ ] Recovery link restores workspace credentials in fresh browser
- [ ] `subscription.deleted` downgrades access

---

## 10. API surface (new/changed)

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/webhooks/stripe` | POST | Stripe signature | Subscription lifecycle |
| `/api/sources/crawl` | POST | Workspace + Pro | Start crawl job |
| `/api/sources/[id]/crawl/cancel` | POST | Workspace + Pro | Cancel in-flight crawl |
| `/api/workspaces/recovery-link` | POST | Workspace headers | Generate signed recovery URL |
| `/api/workspaces/recover` | GET | Signed token | Restore workspace to localStorage |
| `/api/workspaces/recover-request` | POST | Public (rate-limited) | Email recovery link (v1.1) |
| `/api/waitlist` | POST | Public (rate-limited) | Paywall waitlist email → `waitlist_emails` table |

### Waitlist storage — `waitlist_emails`

PostHog is analytics, not a lead database. Store emails in Supabase:

```sql
CREATE TABLE waitlist_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,           -- e.g. 'full_site_crawl'
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  source text NOT NULL,            -- e.g. 'paywall_dialog'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_emails_email_feature_idx
  ON waitlist_emails (lower(email), feature);
```

Still fire `paywall_waitlist_submitted` to PostHog (no raw email in event properties).

Existing routes unchanged for single-page URL and file upload.

---

## 11. Testing & QA additions

Extend `docs/QA_CHECKLIST.md`:

| Scenario | Expected |
|----------|----------|
| Scanned PDF ≤10 pages (free) | OCR succeeds; source ready |
| Scanned PDF >10 pages (free) | Error before OCR call; no provider charge |
| Scanned PDF with BYOK ≤50 pages | Vision OCR; user warned about key usage |
| Root URL → Add this page only | Single-page ingest; notice mentions Pro |
| Root URL → Crawl → waitlist | Email captured; no crawl |
| Pro workspace crawl | Bundled source; expandable pages; scoped chat per page |
| Crawl partial failure | Ready with failed page count shown |
| Payment + recovery | Recovery link works in fresh browser profile |
| Subscription canceled | Crawl returns 403; existing sources remain readable |
| BYOK user without Pro | Crawl blocked at paywall |

---

## 12. Open questions (resolve during implementation)

1. **Grace period on `invoice.payment_failed`:** 0 days vs 3 days before downgrade.
2. **Recovery token expiry:** 365 days (recommended); re-issue via email recovery flow (v1.1).
3. **Vision OCR page rendering:** pdf-to-image library choice (`pdfjs` + canvas in Node action vs external service).
4. **`NEXT_PUBLIC_APP_URL` vs existing `NEXT_PUBLIC_SITE_URL`:** consolidate in `getAppUrl()` helper (default `https://www.ragbase.dev`).

---

## References

- [Stripe Payment Links — URL parameters (`client_reference_id`)](https://docs.stripe.com/payment-links/url-parameters)
- [Firecrawl — crawl API](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get)
- [Firecrawl — document parsing / OCR](https://docs.firecrawl.dev/features/document-parsing)

---

## Approval record

| Reviewer | Status | Date |
|----------|--------|------|
| Product (Drew) | Approved (final, chat 2026-06-22) | 2026-06-22 |
| Engineering | Approved — proceed with phase 6a plan | 2026-06-22 |
