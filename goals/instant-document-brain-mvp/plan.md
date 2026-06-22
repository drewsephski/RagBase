# Implementation Plan — RagBase Instant Document Brain MVP

## Solution approach

Greenfield build: Next.js 15 App Router on Vercel with Supabase (Postgres + pgvector + Storage) as the data layer. Anonymous workspaces authenticate via `workspaceId` + `workspaceSecret` headers; secrets are hashed server-side. Document ingestion runs synchronously in API routes (parse → chunk → embed → store) with client polling. Public URL ingestion uses **Firecrawl** (`firecrawl-aisdk`) to scrape pages into clean markdown — no raw cheerio/Readability pipeline. Chat uses Vercel AI SDK streaming against OpenRouter, with pgvector similarity search for retrieval and structured citation output. UI is dark-mode-first with Shadcn, homepage-as-app layout, and consumer language throughout.

## Ordered steps

### Step 1 — Project scaffold & tooling

**Files/systems:** root `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `eslint.config.mjs`, `.env.example`, `app/layout.tsx`, `components/ui/*`

**Work:**
- `create-next-app` with App Router, TypeScript, Tailwind, ESLint
- Install: `@supabase/supabase-js`, `@supabase/ssr`, `ai`, `@openrouter/ai-sdk-provider`, `zod`, shadcn/ui, `pdf-parse`, `mammoth`, `firecrawl-aisdk`
- Configure path aliases (`@/` → root)
- Dark theme default, base typography

**Verification:**
```bash
npm run build
npm run lint
```

---

### Step 2 — Supabase schema & migrations

**Files/systems:** `supabase/migrations/001_initial.sql`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/lib/definitions.ts`

**Work:**
- Enable `vector` extension
- Tables: `workspaces`, `sources`, `documents`, `chunks`, `messages`
- `workspaces`: id (uuid), secret_hash, plan, message_count, message_count_date, last_seen_at, created_at
- `sources`: workspace_id FK, type (file/url), name, status, storage_path, metadata jsonb
- `documents`: source_id FK, raw_text, page_count, token_count
- `chunks`: document_id FK, chunk_text, embedding vector(1536), page_number, source_location
- `messages`: workspace_id FK, role, content, citations jsonb, model, source_scope (nullable source_id)
- Indexes: workspace lookups, source by workspace, chunks vector index (ivfflat or hnsw)
- Supabase Storage bucket `uploads` with RLS policies scoped by workspace path prefix
- Cron-ready: `last_seen_at` index for retention job

**Verification:**
```bash
supabase db reset   # local
supabase db lint
```
- Manual: confirm pgvector extension and tables exist in Supabase dashboard

---

### Step 3 — Anonymous workspace auth layer

**Files/systems:** `lib/workspace/auth.ts`, `lib/workspace/crypto.ts`, `middleware.ts`, `app/api/workspaces/route.ts`, `hooks/use-workspace.ts`, `lib/workspace/storage.ts`

**Work:**
- Client hook: on mount, read or create `ragbase_workspace_id` + `ragbase_workspace_secret` in localStorage
- POST `/api/workspaces` creates workspace (hash secret with bcrypt/argon2), returns id
- Middleware/helper validates `X-Workspace-Id` + `X-Workspace-Secret` on all protected routes
- Reject mismatched secret; update `last_seen_at` on each authenticated request
- Export typed workspace context for route handlers

**Verification:**
- Jest/RTL test: workspace creation stores credentials in localStorage mock
- API test: valid credentials → 200; wrong secret → 401; missing headers → 401
- API test: workspace A cannot read workspace B sources

---

### Step 4 — Limits enforcement module

**Files/systems:** `lib/limits.ts`, used in upload/chat routes

**Work:**
- Constants: MAX_SOURCES=5, MAX_FILE_BYTES=10MB, MAX_PDF_PAGES=50, MAX_MESSAGES_DAY=30
- `checkSourceLimit(workspaceId)`, `checkFileSize`, `checkPdfPages`, `checkMessageLimit`
- Message counter: increment on chat; reset when `message_count_date < today`
- With user OpenRouter key: higher message limit (e.g. 200/day) but still enforce file/storage limits

**Verification:**
- Unit tests for each limit boundary (4 sources OK, 6th rejected; 31st message rejected; 11MB rejected)

---

### Step 5 — File upload & storage

**Files/systems:** `app/api/sources/upload/route.ts`, `lib/ingestion/storage.ts`, `lib/ingestion/validate.ts`

**Work:**
- Accept multipart upload with workspace auth headers
- Validate MIME/extension: pdf, docx, txt, md
- Upload to Supabase Storage at `{workspaceId}/{sourceId}/{filename}`
- Create `sources` row (status: pending), return sourceId
- Trigger ingestion (Step 6)

**Verification:**
- Integration test: upload valid PDF → source row + storage object created
- Upload 11MB file → 413 with clear error

---

### Step 6 — URL ingestion (Firecrawl)

**Files/systems:** `app/api/sources/url/route.ts`, `lib/ingestion/url.ts`, `.env` (`FIRECRAWL_API_KEY`)

**Work:**
- Accept public URL with workspace auth
- Use Firecrawl scrape API via `firecrawl-aisdk` to fetch clean markdown for a single page
- Detect site-root / homepage URLs → show crawl teaser ("Full-site ingestion is coming soon") instead of ingesting
- Create source row type=url, store scraped markdown, run chunk + embed pipeline
- Enforce 5 URL cap (shared with file cap)
- Full-site crawl deferred to paid tier — MVP uses single-page scrape only

**Verification:**
- Test: valid article URL → Firecrawl markdown stored and chunked
- Test: `https://example.com/` root URL → crawl teaser response, no ingestion
- Test: Firecrawl failure → source status error with user-friendly message

---

### Step 7 — Document parsing & ingestion pipeline

**Files/systems:** `lib/ingestion/pipeline.ts`, `lib/ingestion/pdf.ts`, `lib/ingestion/docx.ts`, `lib/ingestion/chunk.ts`, `lib/ingestion/embed.ts`, `app/api/sources/[id]/status/route.ts`, `app/api/sources/[id]/reprocess/route.ts`

**Work:**
- PDF: `pdf-parse`, extract per-page text, detect low-text (< N chars/page) → status error with scanned message
- DOCX: `mammoth` → plain text
- TXT/MD: direct read
- Chunk: ~500 tokens with overlap, preserve page_number and source_location
- Embed: batch call via `@openrouter/ai-sdk-provider` using `openai/text-embedding-3-small`
- Store documents + chunks; set source status ready/error
- Status endpoint for client polling
- Reprocess: delete old chunks, re-run pipeline

**Verification:**
- Unit test: sample text PDF → chunks with page numbers
- Unit test: scanned PDF fixture → error status, no chunks
- Integration test: poll status pending → processing → ready

---

### Step 8 — Vector search & retrieval

**Files/systems:** `lib/retrieval/search.ts`, `lib/retrieval/context.ts`

**Work:**
- Embed user query
- pgvector cosine similarity search, filter by workspace (join sources)
- Optional `sourceId` filter for "ask only this source"
- Return top-k chunks with metadata for citation assembly
- Build context window with source labels

**Verification:**
- Test: query returns chunks only from scoped workspace/source
- Test: scoped chat excludes other sources' chunks

---

### Step 9 — Chat API with citations

**Files/systems:** `app/api/chat/route.ts`, `lib/chat/prompts.ts`, `lib/chat/citations.ts`, `lib/openrouter/client.ts`

**Work:**
- Use `@openrouter/ai-sdk-provider` with `createOpenRouter({ apiKey })`
- Server default: env `OPENROUTER_API_KEY` → `openrouter.chat('google/gemini-2.0-flash-001')`
- User key: passed per-request from client body, never persisted — `createOpenRouter({ apiKey: userKey })`
- Vercel AI SDK `streamText` with OpenRouter chat models
- System prompt: concise answers, mandatory citations, limitations, no legal advice framing
- Structured citation format in response (source name, page, snippet, chunk id)
- Persist message + citations to `messages` table
- Enforce daily message limit before streaming

**Verification:**
- Test: chat response JSON includes citations array
- Test: 31st message returns 429
- Test: user key switches model, server never stores key (inspect DB)

---

### Step 10 — Starter questions generation

**Files/systems:** `app/api/sources/[id]/starters/route.ts`, `lib/chat/starters.ts`

**Work:**
- After source ready, generate 4–6 suggested questions from document title/first chunks via lightweight LLM call
- Include contract-aware prompts with legal disclaimer when filename/content suggests contract/lease
- Cache on source metadata

**Verification:**
- Test: ready source returns non-empty starter list
- Manual: lease PDF includes disclaimer in contract starter

---

### Step 11 — Homepage & app shell UI

**Files/systems:** `app/page.tsx`, `app/ui/home/upload-zone.tsx`, `app/ui/home/url-input.tsx`, `app/ui/home/trust-row.tsx`, `app/ui/home/prompt-chips.tsx`, `app/ui/layout/app-shell.tsx`

**Work:**
- Homepage = app: drop zone, URL paste, trust row, example chips
- On first upload, transition to app shell (sources left, chat right)
- Privacy copy visible above fold and in settings
- No "RAG"/"embeddings" anywhere in UI copy
- Responsive mobile-first layout

**Verification:**
- Playwright/RTL: homepage renders upload zone + trust row without marketing sections
- Snapshot test for dark theme layout

---

### Step 12 — Source panel

**Files/systems:** `app/ui/sources/source-list.tsx`, `app/ui/sources/source-item.tsx`, `app/ui/sources/source-actions.tsx`

**Work:**
- List sources with status badges (pending/processing/ready/error)
- Delete source (cascade chunks), reprocess, "ask only this source" toggle
- Error state shows scanned PDF message

**Verification:**
- E2E: upload → see status transition → ready badge
- Test: delete source removes from list and DB

---

### Step 13 — Chat panel

**Files/systems:** `app/ui/chat/chat-panel.tsx`, `app/ui/chat/message-list.tsx`, `app/ui/chat/chat-input.tsx`, `app/ui/chat/starter-questions.tsx`, `app/ui/chat/citation-badge.tsx`

**Work:**
- Streaming message display with citation badges inline
- Starter questions clickable → populate input
- Model picker visible only when OpenRouter key in localStorage
- "Add OpenRouter key" button in settings/chat header

**Verification:**
- E2E: send message → streamed response with clickable citations
- Test: no key → no model picker; with key → picker visible

---

### Step 14 — Citation viewer drawer

**Files/systems:** `app/ui/chat/citation-drawer.tsx`, `app/ui/chat/document-viewer.tsx`

**Work:**
- Click citation → drawer with doc name, page, snippet, surrounding context, highlighted passage
- Scroll to page in PDF viewer if file available (or text viewer for other formats)

**Verification:**
- E2E: click citation → drawer shows matching snippet text from source

---

### Step 15 — Settings, OpenRouter key, export

**Files/systems:** `app/ui/settings/settings-panel.tsx`, `lib/openrouter/client-key.ts`, `lib/export/chat.ts`, `app/api/export/chat/route.ts`

**Work:**
- OpenRouter key input → localStorage only
- Model dropdown populated from OpenRouter models API via `@openrouter/ai-sdk-provider`
- Export chat as markdown or JSON download
- Privacy/retention note in settings

**Verification:**
- Test: key saved to localStorage, not in any API POST body persistence
- Test: export returns valid markdown with messages + citations

---

### Step 16 — Delete workspace

**Files/systems:** `app/api/workspaces/delete/route.ts`, `app/ui/settings/delete-workspace.tsx`

**Work:**
- Prominent button in settings AND accessible from main UI footer/header
- Cascade delete: storage objects, chunks, documents, sources, messages, workspace
- Clear localStorage, redirect to fresh homepage

**Verification:**
- E2E: delete → localStorage cleared, DB rows gone, storage objects removed

---

### Step 17 — Retention cron (14-day inactive)

**Files/systems:** `app/api/cron/cleanup/route.ts`, `vercel.json` cron config

**Work:**
- Vercel cron daily: delete workspaces where `last_seen_at < now() - 14 days`
- Cascade same as manual delete
- Protected by `CRON_SECRET` header

**Verification:**
- Test: workspace with last_seen_at 15 days ago deleted by cron handler
- Test: active workspace untouched

---

### Step 18 — Crawl teaser & paid boundary UX

**Files/systems:** `app/ui/upsell/crawl-teaser.tsx`

**Work:**
- Detect root-domain URL paste → show "Full-site ingestion is coming soon"
- Subtle upsell when user tries to add 6th source

**Verification:**
- Manual: paste `https://docs.example.com` root → teaser shown

---

## Risks & open questions

| Risk | Mitigation |
|------|-----------|
| Vercel function timeout on large PDF ingestion | Keep 50-page cap; stream progress via status polling; consider splitting embed batches |
| Free Gemini answers inconsistent | Tight retrieval (top-5), forced citation prompt, short answers |
| Scanned PDFs frustrate users | Early detection + clear OCR-coming message |
| localStorage loss = data loss | Visible "Saved in this browser" copy; recovery link deferred to paid |
| OpenRouter key in request body | HTTPS only; never log request bodies; document in privacy copy |
| pgvector index build time at scale | Fine for MVP (<5 docs/workspace); revisit HNSW params later |
| Supabase Storage RLS complexity | Path-prefix convention `{workspaceId}/*`; service role for server uploads |
| Firecrawl API cost/rate limits | Single-page scrape only in MVP; cache scraped markdown on source; monitor usage |

## Verification summary

```bash
# After each major step
npm run lint && npm run typecheck

# Full suite before ship
npm test                    # unit + integration
npx playwright test         # E2E flows
npm run build               # production build
```

**Critical E2E path:** land → auto workspace → upload PDF → poll ready → ask question → see citations → click citation → delete workspace.
