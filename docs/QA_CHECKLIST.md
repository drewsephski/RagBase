# RagBase public beta — manual QA checklist

Run through this checklist before each beta release or after significant changes. Use a fresh browser profile or clear site data when testing workspace creation flows.

## Document ingestion

| Scenario | Steps | Expected |
| --- | --- | --- |
| PDF upload | Upload a text-based PDF | Source appears in documents panel; status becomes ready; chat unlocks |
| DOCX upload | Upload a `.docx` file | Same as PDF |
| TXT / MD upload | Upload `.txt` or `.md` | Same as PDF |
| Public URL | Paste a clean article URL (not homepage) | Page ingested; source ready; title reflects page |
| Root URL | Paste a site homepage URL | Choice dialog appears; “Add this page only” ingests with Pro notice; “Crawl entire site” opens paywall |
| Scanned PDF | Upload a image-only / scanned PDF | Graceful failure or OCR upsell; clear error in documents panel |

## OCR (phase 6b)

| Scenario | Steps | Expected |
| --- | --- | --- |
| Scanned PDF ≤10 pages (free) | Upload a scanned PDF with ≤10 pages, no OpenRouter key | Status shows “Reading scanned pages…” during OCR; source becomes ready; `ocr_attempted` + `ocr_completed` in PostHog |
| Scanned PDF >10 pages (free) | Upload an 11+ page scanned PDF without OpenRouter key | Error before any OCR provider call; actionable recovery copy (split file or add key); `ocr_failed` with `failure_category: over_cap` |
| Scanned PDF with BYOK ≤50 pages | Add OpenRouter key in Settings; upload scanned PDF ≤50 pages | Vision OCR runs using user key; Settings shows “OCR for larger scans will use your OpenRouter key”; source becomes ready |
| Scanned PDF with BYOK >50 pages | With OpenRouter key saved, upload 51+ page scanned PDF | Error before provider call; recovery copy mentions splitting |
| Reprocess scanned failure | Fail a scanned upload (e.g. over free cap), add key or fix file, tap Reindex | OCR path retries; no stuck processing state |
| OCR analytics hygiene | Inspect `ocr_*` events in PostHog after OCR upload | Properties include only `page_count`, `tier`, `provider`, `success`, `failure_category` — no document text or API keys |
| Blocked URL | Paste a URL that blocks scraping (e.g. login wall) | User-friendly error; no stuck “processing” state |

## Dirty documents (low-quality / messy inputs)

| Scenario | Steps | Expected |
| --- | --- | --- |
| Password-protected PDF | Upload a locked PDF | Clear error; no crash; source shows error state |
| Corrupt / empty file | Upload a zero-byte or corrupt PDF | Validation or ingestion error with actionable message |
| Huge file | Upload a file above size limit | 413 or friendly limit message before upload completes |
| Noisy scan | Upload a PDF with heavy OCR artifacts or mixed columns | Chat may be weaker but app stays usable; citations still render |
| Duplicate upload | Upload the same file twice | Both sources listed or second rejected per limits; no duplicate crash |
| Very long URL page | Paste a long Wikipedia or docs page | Ingest completes or fails gracefully; no infinite processing spinner |

## Chat and citations

| Scenario | Steps | Expected |
| --- | --- | --- |
| Chat with citations | Ask a question about uploaded content | Assistant answer streams; citation badges appear |
| Citation click | Click a citation badge | Drawer opens with snippet and source reference |
| Feedback Yes/No | On last answer, click thumbs up or down | UI accepts feedback; optional reason on negative |
| Copy answer | Click Copy on an assistant message | Text copied; button shows “Copied” briefly |
| Scoped source chat | Select a single document, ask a question | Answer cites only that source when scoped |

## Limits, rate limits, and workspace

| Scenario | Steps | Expected |
| --- | --- | --- |
| Daily message limit | Exhaust free daily messages (or lower limits in dev) | Clear limit message with retry guidance |
| Rate-limit error (chat) | Send many messages quickly with server key | 429 with friendly message; `Retry-After` header; app remains usable |
| Rate-limit error (upload) | Upload many files quickly | Upload blocked with clear message; other actions still work |
| Rate-limit error (URL) | Paste many URLs quickly | URL ingest blocked; uploads/chat unaffected |
| Rate-limit error (waitlist) | Submit waitlist many times from same IP | Friendly throttle message |
| Workspace create throttle | Create many workspaces from same connection | Creation blocked after IP limit |
| Workspace delete | Settings → delete workspace → confirm | Workspace removed from server and local registry; returns to landing or switches workspace |
| Multi-workspace delete | Delete non-active workspace from switcher | Only that workspace removed; active workspace unchanged |

## Layout and mobile

| Scenario | Steps | Expected |
| --- | --- | --- |
| Mobile layout | Repeat PDF upload + chat on phone viewport (~390px) | Sidebar toggles; chat input usable; citations tappable |
| Mobile paywall | Open crawl paywall on ~390px width | Dialog readable; email field and CTA usable without horizontal scroll |
| Mobile settings | Open settings on mobile | Delete workspace and export buttons reachable |
| Beta feedback CTA | With `NEXT_PUBLIC_FEEDBACK_URL` set | Subtle feedback link visible; opens external URL |
| Beta feedback hidden | Without `NEXT_PUBLIC_FEEDBACK_URL` | No feedback CTA shown |
| Debug panel (dev) | In development or `NEXT_PUBLIC_DEBUG_PANEL=true` | Debug toggle shows counts/model/latency; no secrets or raw text |

## Full-site crawl paywall and waitlist (phase 6a)

| Scenario | Steps | Expected |
| --- | --- | --- |
| Crawl hint click | Click “Crawl an entire site” under URL field | Paywall opens; `paywall_viewed` in PostHog |
| Waitlist submit | Enter email on paywall → Unlock site crawling | Email in `waitlist_emails`; success message; no email in PostHog properties |
| Duplicate waitlist | Submit same email twice | Both return success; one DB row |
| Invalid waitlist email | Submit malformed email | Validation error; no DB row |
| Waitlist honeypot | Fill hidden honeypot field (automated test) | Silent success; no DB row |
| Root URL → single page | Paste `https://example.com/` → Add this page only | Single-page ingest; Pro notice |
| Root URL → crawl | Paste root URL → Crawl entire site | Paywall opens; no ingest |
| Non-root URL | Paste article URL | No choice dialog; direct single-page ingest |

## Billing and recovery (phase 6c)

Flags must stay off until webhook QA passes: `STRIPE_WEBHOOKS_ENABLED=false`, `NEXT_PUBLIC_BILLING_ENABLED=false`.

| Scenario | Steps | Expected |
| --- | --- | --- |
| Webhook test checkout | Stripe CLI → `checkout.session.completed` with `client_reference_id` | Workspace `plan=pro`; subscription fields populated |
| Checkout return pending | Complete test checkout; return before webhook | “Activating your Pro workspace…” then resolves within 60s |
| Checkout return timeout | Return with webhook disabled | Timeout copy + support mailto after 60s |
| Recovery link | Settings or post-checkout → copy link → open in fresh profile | Workspace restored; old secret rotated |
| Recovery expired | Use expired/revoked token | Generic error; support mailto |
| Customer Portal | Settings → Manage billing | Stripe portal opens; cancel downgrades workspace on webhook |
| Past due grace | Trigger `invoice.payment_failed` in test mode | `past_due` status; Pro access for 3 days |
| Flags off | Default env | Paywall shows waitlist, not checkout |
| Flags on (after QA) | Enable billing + webhooks | Paywall opens Stripe Payment Link with workspace id |

## Analytics (production smoke)

| Scenario | Steps | Expected |
| --- | --- | --- |
| PostHog events | With `POSTHOG_PROJECT_API_KEY` (phc_*) set, upload + chat | Events appear in PostHog project **ragbase** (`file_uploaded`, `answer_completed`, etc.) |
| Sanitized metadata | Inspect event properties in PostHog | No message text, answers, snippets, API keys, or workspace secrets |

## Production infrastructure (smoke)

| Scenario | Steps | Expected |
| --- | --- | --- |
| Redis rate limits | With `UPSTASH_REDIS_REST_*` set in production | Rate limits persist across server instances (not per-instance memory) |
| CI pipeline | Push to `main` or open PR | GitHub Actions passes install, lint, typecheck, test, build |
