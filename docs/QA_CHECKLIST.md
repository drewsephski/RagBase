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
| Blocked URL | Paste a URL that blocks scraping (e.g. login wall) | User-friendly error; no stuck “processing” state |

## Chat and citations

| Scenario | Steps | Expected |
| --- | --- | --- |
| Chat with citations | Ask a question about uploaded content | Assistant answer streams; citation badges appear |
| Citation click | Click a citation badge | Drawer opens with snippet and source reference |
| Feedback Yes/No | On last answer, click thumbs up or down | UI accepts feedback; optional reason on negative |
| Copy answer | Click Copy on an assistant message | Text copied; button shows “Copied” briefly |

## Limits and workspace

| Scenario | Steps | Expected |
| --- | --- | --- |
| Rate-limit error | Send many messages quickly (or lower limits in dev) | Clear rate-limit message; app remains usable |
| Workspace delete | Settings → delete workspace → confirm | Workspace removed; returns to landing or empty state |

## Layout and polish

| Scenario | Steps | Expected |
| --- | --- | --- |
| Mobile layout | Repeat PDF upload + chat on phone viewport (~390px) | Sidebar toggles; chat input usable; citations tappable |
| Beta feedback CTA | With `NEXT_PUBLIC_FEEDBACK_URL` set | Subtle feedback link visible; opens external URL |
| Beta feedback hidden | Without `NEXT_PUBLIC_FEEDBACK_URL` | No feedback CTA shown |
| Debug panel (dev) | In development or `NEXT_PUBLIC_DEBUG_PANEL=true` | Debug toggle shows counts/model/latency; no secrets or raw text |

## Full-site crawl paywall (phase 6a)

| Scenario | Steps | Expected |
| --- | --- | --- |
| Crawl hint click | Click “Crawl an entire site” under URL field | Paywall opens; `paywall_viewed` in PostHog |
| Waitlist submit | Enter email on paywall → Unlock site crawling | Email in `waitlist_emails`; success message; no email in PostHog properties |
| Duplicate waitlist | Submit same email twice | Both return success; one DB row |
| Root URL → single page | Paste `https://example.com/` → Add this page only | Single-page ingest; Pro notice |
| Root URL → crawl | Paste root URL → Crawl entire site | Paywall opens; no ingest |
| Non-root URL | Paste article URL | No choice dialog; direct single-page ingest |

## Analytics (production smoke)

| Scenario | Steps | Expected |
| --- | --- | --- |
| PostHog events | With `POSTHOG_PROJECT_API_KEY` (phc_*) set, upload + chat | Events appear in PostHog project **ragbase** (`file_uploaded`, `answer_completed`, etc.) |
| Sanitized metadata | Inspect event properties in PostHog | No message text, answers, snippets, API keys, or workspace secrets |
