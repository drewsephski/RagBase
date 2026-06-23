# Feature Roadmap — Design Spec

**Status:** Draft (pending review)  
**Date:** 2026-06-23  
**Product:** RagBase — Instant Document Brain

## Summary

Prioritized feature roadmap following a brainstorming session focused on **revenue & conversion** plus **open product exploration**. Revenue work anchors on finishing the already-approved **Phase 6c** (Stripe Pro + recovery) and **Phase 6d** (live full-site crawl) from [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md). Post-foundation work splits into **conversion-supporting** features (funnel polish) and **standalone product/UX** improvements (free-tier depth).

**Sequencing approach:** Strict waterfall — **6c → 6d → conversion Tier 1 → product Tier 1 → remaining tiers** — with light parallel work allowed only when it does not expose live checkout or depend on Pro being active (copy, analytics shells, settings layout).

---

## Brainstorming decisions (locked)

| Question | Decision |
|----------|----------|
| Primary outcomes | Revenue & conversion **and** broad product exploration |
| Revenue anchor | Finish spec'd path first (6c + 6d) before net-new monetization models |
| Open exploration scope | Both conversion-first **and** standalone product wins, prioritized after 6c/6d |
| Sequencing model | Waterfall (Approach 1) with minimal safe parallel (Approach 2 lite) |

---

## Goals

| Goal | Success criteria |
|------|------------------|
| Ship revenue foundation | User can pay $9/mo, save recovery link, crawl a site, chat with cross-page citations |
| Reduce paid churn | Recovery link saved at checkout; Pro status and quotas visible in Settings |
| Improve free-tier stickiness | Document-aware starters, clearer ingest/error UX, retention transparency |
| Measure funnel | PostHog insights from paywall view through first cross-page question |

## Non-goals (this roadmap)

- Full user accounts / login (unless required later for team billing)
- Net-new monetization (annual plans, team seats, API access, OCR packs) before 6c/6d ship
- Raising free source/message limits for Pro (not in current crawl spec; revisit separately)
- Read-only share links, browser clipper, chat threads per source (Tier 3 — validate demand first)

---

## Phase 0 — Revenue foundation (must-ship first)

> Detailed technical design: [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md). Phase 6a (paywall + waitlist) and 6b (OCR) are **done**.

### Phase 6c — Stripe Pro + recovery

| Item | Description |
|------|-------------|
| Stripe webhook handler | `POST /api/webhooks/stripe` — handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |
| Schema migration | Pro columns on `workspaces`; `workspace_recovery_tokens` table |
| `requireProPlan()` | Gate crawl when `plan === 'pro'` AND subscription active/trialing AND period not expired |
| Live Payment Link CTA | Replace waitlist when `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL` set **and** webhooks tested E2E |
| Post-checkout return | Success URL → poll workspace plan → show recovery link screen |
| Recovery link API | `POST /api/workspaces/recovery-link` (create), `GET /app/recover?token=…` (exchange) |
| Recovery in Settings | Regenerate / revoke recovery tokens |
| Analytics | `recovery_link_generated`, `recovery_link_used`, checkout funnel events |

**Optional 6c follow-up:** Email-based recovery via Stripe checkout email (`POST /api/workspaces/recover-request` + Resend/SendGrid). Spec §2 “better version.”

### Phase 6d — Live full-site crawl

| Item | Description |
|------|-------------|
| Crawl API | `POST /api/sources/crawl` — async Firecrawl job, Pro-gated |
| Bundled source UI | One crawl source with expandable page list |
| Usage enforcement | 1 active crawl, 3 crawls/period, 75 pages/period (env-configurable) |
| Progress + partial failure UX | Staged status, “N pages could not be read” notice |
| Cancel endpoint | `POST /api/sources/{id}/crawl/cancel` |
| End-to-end flow | Root URL → choice dialog → paywall (non-Pro) or crawl (Pro) |

### Foundation done criteria

A user can paste a root URL, subscribe via Stripe Payment Link, save a recovery link, crawl the site, and ask cross-page questions with citations — without support contact.

---

## Phase 1 — Conversion & funnel (after 6c/6d)

### Tier 1 — Ship with or immediately after 6d

| Feature | Description | Priority |
|---------|-------------|----------|
| **Recovery link onboarding gate** | Post-checkout screen blocks app until user copies recovery link and confirms “I saved it” | P0 |
| **Pro status + quota in Settings** | Plan badge, period end, crawl usage (`2/3 crawls`, `41/75 pages`), Stripe customer portal link | P0 |
| **Template-aware paywall copy** | Paywall headline/value adapt to active workspace template (8 verticals in `lib/domain/templates.ts`) | P1 |
| **Waitlist → Pro launch email** | One-click email to `waitlist_emails` when Stripe goes live | P1 |

### Tier 2 — Upgrade moments

| Feature | Description | Priority |
|---------|-------------|----------|
| **Crawl preview on paywall** | Estimate pages crawlable from domain before checkout | P2 |
| **Free vs Pro comparison** | Inline paywall row: single page (free) vs whole site (Pro) + quotas | P2 |
| **Post-crawl value moment** | First successful crawl → toast + suggested cross-page prompt chip | P2 |
| **Source-limit soft upsell** | At 5 sources: honest copy — delete to add more; note crawl bundles pages into one source (no false Pro source-limit promise) | P3 |

### Tier 3 — Measurement & optimization

| Feature | Description | Priority |
|---------|-------------|----------|
| **Funnel dashboard (PostHog)** | paywall viewed → subscribe → checkout success → recovery saved → first crawl → first cross-page question | P2 |
| **Checkout drop-off recovery** | Cancel URL → retry checkout + single-page fallback for same domain | P3 |
| **Email recovery** | Checkout email → send recovery link (6c follow-up) | P3 |

---

## Phase 2 — Product & UX (independent of Pro)

### Tier 1 — High impact

| Feature | Description | Priority |
|---------|-------------|----------|
| **Document-aware starter questions** | Generate 4–6 questions from title/first chunks after source ready (MVP step 10; replace generic `DOCUMENT_STARTER_PROMPTS` when doc-specific) | P1 |
| **Multi-source prompt chips** | When 2+ sources ready: “Compare these documents”, “What conflicts between sources?” — align with `vendor-compare`, `contract-review` templates | P1 |
| **Retention expiry notice** | Settings + banner: “Workspace deleted in X days due to inactivity” (14-day cron exists) | P1 |
| **Ingestion progress UX** | Staged OCR/URL status (“Reading page 3 of 8…”), optional browser notification on ready | P2 |
| **Smarter error recovery panel** | Unified failed-source actions: reprocess, split PDF, add BYOK, try single-page URL | P2 |

### Tier 2 — Power users & templates

| Feature | Description | Priority |
|---------|-------------|----------|
| **Batch file upload** | Multi-select within 5-source cap | P2 |
| **Regenerate answer** | “Try again” on last assistant message | P2 |
| **Export with formatted citations** | Markdown export with inline footnotes / `[Source: page N]` for meeting-ready output | P2 |
| **Citation drawer: copy passage** | One-click copy snippet + source reference | P3 |
| **Duplicate source detection** | Filename/hash check before ingest | P3 |
| **Mobile layout pass** | Bottom-sheet citation drawer, thumb-friendly upload, fixed chat input | P2 |

### Tier 3 — Validate before building

| Feature | Notes |
|---------|-------|
| Read-only share link | Privacy, auth, abuse — needs separate spec |
| Saved passages / bookmarks | localStorage per workspace |
| Browser clipper extension | High build cost; validate via template CTAs first |
| Keyboard shortcuts | After mobile + starters |
| Chat threads per source | Schema/UI complexity; scoped chat exists with shared history |

---

## Recommended build order

```text
6c (Stripe + recovery)
  → 6d (crawl API + UI)
    → Phase 1 Tier 1 (recovery gate, Pro settings, template paywall, waitlist email)
      → Phase 2 Tier 1 (starters, multi-source chips, retention notice)
        → Phase 1 Tier 2 + Phase 2 Tier 2 (parallel by capacity)
          → Phase 1 Tier 3 + Phase 2 Tier 3 (validate first)
```

**Quick wins bundle** (one sprint post-6d): document-aware starters + retention notice + citation copy button + duplicate detection.

---

## Dependencies & references

| Document | Relationship |
|----------|--------------|
| [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md) | Authoritative for 6c/6d implementation |
| [`../plans/2026-06-22-phase-6a-paywall-plan.md`](../plans/2026-06-22-phase-6a-paywall-plan.md) | 6a complete |
| [`../../workspace-recovery.md`](../../workspace-recovery.md) | Recovery stub — superseded by OCR/crawl spec §2 for 6c |
| [`../../QA_CHECKLIST.md`](../../QA_CHECKLIST.md) | Manual QA for beta flows |

---

## Analytics events (existing + new)

**Existing (use in funnel dashboard):** `paywall_viewed`, `paywall_subscribe_clicked`, `paywall_waitlist_submitted`, `paid_intent`, `recovery_link_generated`, `recovery_link_used`, `ocr_*`, answer feedback.

**New (Phase 1):** `recovery_link_confirmed` (user clicked “I saved it”), `pro_settings_viewed`, `crawl_preview_shown`, `post_crawl_first_question_suggested`.

**New (Phase 2):** `starters_generated`, `multi_source_chip_clicked`, `retention_notice_shown`, `citation_passage_copied`.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Live checkout before webhooks work | Do not enable Payment Link CTA until 6c E2E tested (per existing spec) |
| Paid user loses workspace | Mandatory recovery gate at checkout; email recovery follow-up |
| Crawl cost overrun | Enforce limits before Firecrawl call; usage meters in Settings |
| Scope creep on Tier 3 | Explicit validate-first gate; no build without demand signal |

---

## Open questions (deferred)

1. **Pro perks beyond crawl** — Should Pro eventually raise source cap or message limit? Not in current spec; decide after crawl revenue data.
2. **Annual pricing** — Stripe supports it; defer until monthly conversion baseline exists.
3. **Template-specific Pro landing pages** — Marketing/GTM decision after template-aware paywall copy ships.
