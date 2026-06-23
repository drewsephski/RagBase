# Feature Roadmap — Design Spec

**Status:** Approved  
**Date:** 2026-06-23  
**Product:** RagBase — Instant Document Brain

## Summary

Prioritized feature roadmap following a brainstorming session focused on **revenue & conversion** plus **open product exploration**. Revenue work anchors on finishing the already-approved **Phase 6c** (Stripe Pro + recovery) and **Phase 6d** (live full-site crawl) from [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md). Post-foundation work splits into **conversion-supporting** features (funnel polish) and **standalone product/UX** improvements (free-tier depth).

**Sequencing approach:** Strict waterfall — **6c → 6d → conversion Tier 1 → product Tier 1 → remaining tiers** — with light parallel work allowed only when it does not expose live checkout or depend on Pro being active (copy, analytics shells).

Phase **6c is a safe billing foundation**, not just “turn on Stripe.” Once users can pay, recovery, portal access, pending activation, support fallback, and feature flags are required — not optional.

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
| Ship billing foundation (6c) | User can subscribe, manage billing, save recovery link, and see Pro activate reliably |
| Ship revenue foundation (6c + 6d) | User can pay $9/mo, save recovery link, crawl a site, chat with cross-page citations |
| Reduce paid churn | Recovery link strongly encouraged at checkout; persistent banner until confirmed |
| Improve free-tier stickiness | Document-aware starters, clearer ingest/error UX, retention transparency |
| Measure funnel | PostHog insights from paywall view through first cross-page question |

## Non-goals (this roadmap)

- Full user accounts / login (unless required later for team billing)
- Net-new monetization (annual plans, team seats, API access, OCR packs) before 6c/6d ship
- Raising free source/message limits for Pro (not in current crawl spec; revisit separately)
- Read-only share links, browser clipper, chat threads per source (Tier 3 — validate demand first)

---

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| **6a** — Paywall + waitlist | **Done** | Root URL choice dialog, waitlist capture, analytics |
| **6b** — OCR for scanned PDFs | **Done** | Shipped in `lib/ingestion/ocr/` (Firecrawl free tier + BYOK vision). Independent of 6c; not required for Stripe + crawl billing. |
| **6c** — Stripe Pro + recovery | **Next** | See scope below |
| **6d** — Live full-site crawl | **Blocked on 6c** | Pro-gated crawl API + bundled source UI |

---

## Phase 6c — Stripe Pro + recovery (narrow scope)

> Detailed webhook/schema design: [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md) §1–2.

### In scope (6c only)

| Item | Description |
|------|-------------|
| Subscription schema | Pro columns on `workspaces`; `workspace_recovery_tokens` table |
| Stripe webhook | `POST /api/webhooks/stripe` — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |
| `requireProPlan()` | Gate Pro features when `plan === 'pro'` AND subscription active/trialing AND period not expired |
| Recovery token table + API | `POST /api/workspaces/recovery-link` (create), `GET /app/recover?token=…` (exchange); regenerate/revoke in Settings |
| Checkout return + polling | Success URL → poll workspace plan; handle `checkout_success_pending` state (see below) |
| Recovery screen | Post-checkout recovery step (see UX below) |
| Billing portal | `POST /api/billing/portal` → Stripe Customer Portal for active Pro workspace; Settings shows **Manage billing** when `stripe_customer_id` exists |
| Feature flags | `NEXT_PUBLIC_BILLING_ENABLED`, `STRIPE_WEBHOOKS_ENABLED` — gate live checkout (see rollout) |
| Support fallback | `NEXT_PUBLIC_SUPPORT_EMAIL` — mailto in pending sync, recovery, portal failure, subscription mismatch |
| Analytics | `recovery_link_*`, checkout funnel, `checkout_success_pending`, `recovery_link_confirmed`, `recovery_link_deferred` |
| QA | E2E test-mode checkout, recovery in fresh browser, portal, downgrade |

### Explicitly out of scope for 6c

- Crawl API, crawl UI, crawl quota meters
- Template-aware paywall copy
- Waitlist → Pro launch email campaign
- Document-aware starters or other Phase 2 product work
- Email-based recovery via checkout email (6c follow-up, not blocking)

### Feature flags & rollout

Before live checkout:

```txt
NEXT_PUBLIC_BILLING_ENABLED=false
STRIPE_WEBHOOKS_ENABLED=false
NEXT_PUBLIC_SUPPORT_EMAIL=support@ragbase.dev
```

Rollout sequence:

```txt
1. Schema + webhook + recovery code merged
2. Test-mode webhook passes
3. Recovery link works in fresh browser
4. Customer Portal works (manage/cancel)
5. Plan downgrade on subscription.deleted verified
6. STRIPE_WEBHOOKS_ENABLED=true (webhook processing live)
7. NEXT_PUBLIC_BILLING_ENABLED=true
8. Payment Link CTA visible in paywall
9. At least one manual live $1/test-price checkout (if using live mode)
10. Waitlist → Pro launch email (Phase 1 — after 6c QA only)
```

Do not expose a live Payment Link CTA until steps 1–8 pass.

### Checkout return — `checkout_success_pending`

Stripe webhook delays happen. Success return flow must handle activation lag:

1. User returns from Stripe → app enters `checkout_success_pending`
2. UX: **“Payment received. Activating your Pro workspace…”**
3. Poll workspace subscription status for 30–60 seconds
4. On Pro detected → recovery screen
5. If still not active after timeout → **“Still syncing. You can refresh in a moment or contact support.”** with `NEXT_PUBLIC_SUPPORT_EMAIL` mailto link

Without this, users who return faster than the webhook may think payment failed.

Track analytics event: `checkout_success_pending` (with `resolved: true/false`).

### Recovery screen UX (strong but not hostile)

Post-checkout recovery step is **strongly gated before starting a crawl**, but users can return to the app. Crawl CTA continues nudging recovery until confirmed.

Do **not** hard-block the entire app (clipboard APIs fail, mobile behaves oddly, support burden).

**Screen copy:**

```txt
Your Pro workspace is ready.
Save this private recovery link before crawling your first site.

[Copy recovery link]
[I saved it]
[Do this later]
```

| Action | Behavior |
|--------|----------|
| **I saved it** | Mark `recovery_link_confirmed`; dismiss gate; allow crawl |
| **Do this later** | Allow app access; show persistent Settings banner until confirmed |
| **First crawl attempt** (unconfirmed) | Re-show recovery step or inline nudge before crawl starts |

Settings banner (until confirmed): **“Save your recovery link so you don’t lose Pro access on this device.”**

### Support fallback (`NEXT_PUBLIC_SUPPORT_EMAIL`)

Use mailto (v1 is enough) in:

- Checkout sync pending timeout
- Recovery link generation/exchange failure
- Billing portal session failure
- Subscription active in Stripe but Pro not enabled on workspace

### Optional 6c follow-up

Email-based recovery via Stripe checkout email (`POST /api/workspaces/recover-request` + Resend/SendGrid). Spec §2 “better version.”

---

## Phase 6d — Live full-site crawl

> Blocked until 6c QA passes. Detailed design: OCR/crawl spec §5–6.

| Item | Description |
|------|-------------|
| Crawl API | `POST /api/sources/crawl` — async Firecrawl job, `requireProPlan()` |
| Bundled source UI | One crawl source with expandable page list |
| Usage enforcement | 1 active crawl, 3 crawls/period, 75 pages/period (env-configurable) |
| Progress + partial failure UX | Staged status, “N pages could not be read” notice |
| Cancel endpoint | `POST /api/sources/{id}/crawl/cancel` |
| End-to-end flow | Root URL → choice dialog → paywall (non-Pro) or crawl (Pro) |
| Crawl quota in Settings | `2/3 crawls`, `41/75 pages` — **Phase 6d**, not 6c |

### Foundation done criteria (6c + 6d)

A user can paste a root URL, subscribe via Stripe Payment Link, save a recovery link, crawl the site, and ask cross-page questions with citations — without support contact.

---

## Approved build order

```txt
6c.1 — Schema + webhook + subscription state
6c.2 — Recovery tokens + recover route
6c.3 — Checkout return + recovery screen (+ checkout_success_pending polling)
6c.4 — Customer portal + Settings billing state (Manage billing, basic Pro badge)
6c.5 — Feature-flagged live Payment Link CTA
6c.6 — E2E QA (test checkout, recovery fresh browser, portal, downgrade, live test price)
6d   — Pro-gated crawl API + bundled source UI + crawl quota in Settings
  → Phase 1 Tier 1 (recovery nudge polish, template paywall, waitlist email after 6c QA)
  → Phase 2 Tier 1 (starters, multi-source chips, retention notice)
  → Phase 1 Tier 2 + Phase 2 Tier 2
  → Phase 1 Tier 3 + Phase 2 Tier 3 (validate first)
```

---

## Phase 1 — Conversion & funnel (after 6c/6d)

### Tier 1 — After 6d (or parallel post-6c QA for non-crawl items)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Recovery nudge polish** | Persistent banner + crawl-gate nudge until `recovery_link_confirmed` (core UX in 6c; polish here) | P1 |
| **Crawl quota in Settings** | `2/3 crawls`, `41/75 pages this period` — ships with 6d | P0 (6d) |
| **Template-aware paywall copy** | Paywall headline/value adapt to active workspace template | P1 |
| **Waitlist → Pro launch email** | One-click email to `waitlist_emails` — **only after 6c QA** (step 10 in rollout) | P1 |

**Waitlist email gate — send only after:**

- Stripe test checkout passes
- Recovery link works in fresh browser
- Customer Portal works
- Plan downgrade works
- At least one manual live $1/test-price checkout (if using live mode)

### Tier 2 — Upgrade moments

| Feature | Description | Priority |
|---------|-------------|----------|
| **Crawl preview on paywall** | Estimate pages crawlable from domain before checkout | P2 |
| **Free vs Pro comparison** | Inline paywall row: single page (free) vs whole site (Pro) + quotas | P2 |
| **Post-crawl value moment** | First successful crawl → toast + suggested cross-page prompt chip | P2 |
| **Source-limit soft upsell** | At 5 sources: delete to add more; note crawl bundles pages into one source | P3 |

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
| **Document-aware starter questions** | Generate 4–6 questions from title/first chunks after source ready | P1 |
| **Multi-source prompt chips** | When 2+ sources ready: compare/conflict prompts for template verticals | P1 |
| **Retention expiry notice** | Settings + banner: workspace deleted in X days due to inactivity | P1 |
| **Ingestion progress UX** | Staged OCR/URL status, optional browser notification on ready | P2 |
| **Smarter error recovery panel** | Unified failed-source actions: reprocess, split PDF, add BYOK, single-page URL | P2 |

### Tier 2 — Power users & templates

| Feature | Description | Priority |
|---------|-------------|----------|
| **Batch file upload** | Multi-select within 5-source cap | P2 |
| **Regenerate answer** | “Try again” on last assistant message | P2 |
| **Export with formatted citations** | Markdown export with inline footnotes for meeting-ready output | P2 |
| **Citation drawer: copy passage** | One-click copy snippet + source reference | P3 |
| **Duplicate source detection** | Filename/hash check before ingest | P3 |
| **Mobile layout pass** | Bottom-sheet citation drawer, thumb-friendly upload | P2 |

### Tier 3 — Validate before building

| Feature | Notes |
|---------|-------|
| Read-only share link | Privacy, auth, abuse — needs separate spec |
| Saved passages / bookmarks | localStorage per workspace |
| Browser clipper extension | High build cost; validate via template CTAs first |
| Keyboard shortcuts | After mobile + starters |
| Chat threads per source | Schema/UI complexity |

**Quick wins bundle** (one sprint post-6d): document-aware starters + retention notice + citation copy button + duplicate detection.

---

## Dependencies & references

| Document | Relationship |
|----------|--------------|
| [`2026-06-22-ocr-and-crawl-design.md`](./2026-06-22-ocr-and-crawl-design.md) | Authoritative for webhook/schema/crawl detail |
| [`../plans/2026-06-22-phase-6a-paywall-plan.md`](../plans/2026-06-22-phase-6a-paywall-plan.md) | 6a complete |
| [`../../workspace-recovery.md`](../../workspace-recovery.md) | Recovery stub — superseded by §2 above for 6c |
| [`../../QA_CHECKLIST.md`](../../QA_CHECKLIST.md) | Manual QA; extend for 6c billing flows |

---

## Analytics events

**Existing:** `paywall_viewed`, `paywall_subscribe_clicked`, `paywall_waitlist_submitted`, `paid_intent`, `recovery_link_generated`, `recovery_link_used`, `ocr_*`, answer feedback.

**New (6c):** `checkout_success_pending`, `checkout_success_resolved`, `recovery_link_confirmed`, `recovery_link_deferred`, `billing_portal_opened`, `billing_portal_failed`.

**New (Phase 1 post-6d):** `pro_settings_viewed`, `crawl_preview_shown`, `post_crawl_first_question_suggested`, `waitlist_pro_email_sent`.

**New (Phase 2):** `starters_generated`, `multi_source_chip_clicked`, `retention_notice_shown`, `citation_passage_copied`.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Live checkout before webhooks work | Feature flags; rollout sequence steps 1–8 |
| Webhook slower than checkout return | `checkout_success_pending` polling + support mailto |
| Paid user loses workspace | Recovery screen + crawl gate nudge; Settings banner until confirmed |
| Hard app block after checkout | Allow “Do this later”; nudge at crawl time instead |
| Crawl cost overrun | Enforce limits before Firecrawl call (6d); quota UI in Settings |
| Billing without support path | `NEXT_PUBLIC_SUPPORT_EMAIL` on all failure states |
| Scope creep in 6c | Explicit in/out scope list above |

---

## Open questions (deferred)

1. **Pro perks beyond crawl** — Decide after crawl revenue data.
2. **Annual pricing** — Defer until monthly conversion baseline exists.
3. **Template-specific Pro landing pages** — GTM decision after template-aware paywall copy ships.
