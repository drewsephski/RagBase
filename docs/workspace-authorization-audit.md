# Workspace authorization audit

RagBase uses the Supabase **service role** on API routes. Row Level Security is not applied to these calls, so every query must be scoped by `workspace_id` after `requireWorkspace()` validates `x-workspace-id` and `x-workspace-secret`.

## Route audit

| Route | Auth | Service-role scope | Notes |
| --- | --- | --- | --- |
| `POST /api/workspaces` | None (create) | Inserts new workspace only | Rate-limited by IP |
| `PATCH /api/workspaces` | `requireWorkspace` | `.eq("id", workspace.id)` on update | OK |
| `DELETE /api/workspaces/delete` | `requireWorkspace` | `deleteWorkspace(workspace.id)` | OK |
| `GET /api/sources` | `requireWorkspace` | `.eq("workspace_id", workspace.id)` | OK |
| `POST /api/sources/upload` | `requireWorkspace` | Insert scoped to workspace; storage path prefixed | OK |
| `POST /api/sources/url` | `requireWorkspace` | Insert scoped to workspace | OK |
| `DELETE /api/sources/[id]` | `requireWorkspace` | `.eq("id", id).eq("workspace_id", workspace.id)` | OK |
| `GET /api/sources/[id]/status` | `requireWorkspace` | `.eq("id", id).eq("workspace_id", workspace.id)` | OK |
| `POST /api/sources/[id]/reprocess` | `requireWorkspace` | Source verified in workspace before pipeline | OK |
| `GET /api/sources/[id]/starters` | `requireWorkspace` | Source verified; update scoped by workspace | OK |
| `POST /api/chat` | `requireWorkspace` | Messages insert with `workspace_id`; retrieval uses `filter_workspace_id` | `sourceId` verified via `assertSourceInWorkspace` |
| `GET /api/export/chat` | `requireWorkspace` | `.eq("workspace_id", workspaceId)` on messages | OK |
| `POST /api/waitlist` | Optional workspace | Inserts waitlist row; optional `workspace_id` from verified headers | OK |
| `POST /api/analytics` | None | No DB reads/writes | OK |
| `GET/POST /api/cron/cleanup` | `CRON_SECRET` | Deletes inactive workspaces by `last_seen_at` | Intentional admin path |

## Internal modules (called after route auth)

| Module | Scope | Notes |
| --- | --- | --- |
| `lib/limits.ts` | `.eq("id", workspaceId)` or `.eq("workspace_id", workspaceId)` | OK |
| `lib/retrieval/search.ts` | `match_chunks` RPC with `filter_workspace_id`; `fetchSourceChunksOrdered` checks workspace | OK |
| `lib/ingestion/pipeline.ts` | Operates on `sourceId` after route verified ownership | Callers must verify first |
| `lib/workspace/delete.ts` | `deleteWorkspace(workspaceId)` | OK |
| `lib/chat/starters.ts` | `generateStarterQuestionsForSource` — internal; route layer verifies workspace | Prefer route-scoped calls |

## Helpers

Use `lib/supabase/workspace-scope.ts` for defense-in-depth when loading or mutating sources:

- `getSourceInWorkspace(supabase, workspaceId, sourceId, columns)`
- `assertSourceInWorkspace(supabase, workspaceId, sourceId)`

## Future: Supabase Auth

When auth ships, keep service-role routes but add user ownership checks on workspaces. Recovery tokens (`workspace_recovery_tokens`) provide cross-device access without full accounts — see `docs/workspace-recovery.md`.
