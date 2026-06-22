# RagBase — Instant Document Brain MVP

## Goal

Build RagBase as a consumer-grade "instant document brain": users land on the homepage, drop a PDF/contract/note or paste a public URL, and chat with cited answers immediately — no signup required. Anonymous workspaces persist in the browser for 14 days, with Supabase as the backend and optional client-side OpenRouter keys for model selection.

## Shared understanding

See [facts.md](./facts.md) for the full list of 31 accepted, testable facts covering positioning, anonymous workspace auth, limits, ingestion, chat/citations, privacy UX, and MVP scope boundaries.

## Execution plan

See [plan.md](./plan.md) for the 18-step implementation plan (scaffold → Supabase schema → workspace auth → ingestion with Firecrawl → pgvector retrieval → cited chat → UI → retention cron). Plan is approved via Plannotator.

## Key decisions locked

| Decision | Choice |
|----------|--------|
| Database | Supabase Postgres + pgvector + Storage |
| Retention | 14 days inactive auto-delete |
| URL limit | 5 URLs total (shared doc cap) |
| Ingestion | Sync API + client polling |
| URL scraping | Firecrawl (`firecrawl-aisdk`) |
| LLM provider | `@openrouter/ai-sdk-provider` |
| Default model | `google/gemini-2.0-flash-001` |
| Embeddings | `openai/text-embedding-3-small` (1536d) |
| Rate limiting | Postgres counter per workspace |
| Hosting | Vercel |
| MVP extras | Export chat, ask-one-source, reprocess source |

## Done condition

All facts in `facts.md` are verifiable in a deployed Vercel preview:

1. Homepage is the app with upload, URL paste, trust row, and prompt chips
2. Anonymous workspace created and persisted in localStorage
3. Upload PDF/DOCX/TXT/MD or paste URL → ingestion → chat with citations
4. Citation viewer, starter questions, source panel actions all work
5. Limits enforced (5 docs, 10 MB, 50 pages, 30 msgs/day)
6. Delete workspace clears everything
7. OpenRouter key client-side unlocks model picker
8. 14-day retention cron running
9. No payments, no accounts, no "RAG" jargon in UI
10. `npm run lint`, `npm test`, and critical E2E path pass
