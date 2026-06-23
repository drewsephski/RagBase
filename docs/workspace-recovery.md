# Workspace recovery link (design stub)

> **Status:** Spec'd for Phase 6c. Implementation plan: [`docs/superpowers/plans/2026-06-23-phase-6c-stripe-recovery-plan.md`](./superpowers/plans/2026-06-23-phase-6c-stripe-recovery-plan.md). Superseded by roadmap spec §Recovery for product UX; this file retains API/table notes.

## Problem

Workspaces are identified by `workspaceId` + `workspaceSecret` stored in browser `localStorage`. Clearing site data or switching devices loses access. Full Supabase Auth is out of scope for the current phase; recovery links offer optional cross-device access without forced signup.

## Proposed table: `workspace_recovery_tokens`

```sql
-- TODO: implement in a future migration (not applied yet)
create table public.workspace_recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null,           -- bcrypt hash of opaque token (never store raw)
  label text,                         -- optional user label, e.g. "Work laptop"
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,    -- e.g. 90 days or one-time use
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index workspace_recovery_tokens_workspace_id_idx
  on public.workspace_recovery_tokens (workspace_id);

create unique index workspace_recovery_tokens_token_hash_idx
  on public.workspace_recovery_tokens (token_hash);
```

## Recovery URL shape

```
{NEXT_PUBLIC_APP_URL}/recover?token={opaque_token}
```

1. User opens link → API validates token hash, resolves `workspace_id`.
2. API returns a **new** workspace secret (rotate on recovery) or re-issues the existing secret (simpler but less secure).
3. Client stores credentials in local registry via `addWorkspace()`.

## API sketch (future)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/workspaces/recovery` | Create recovery link (requires workspace headers) |
| `GET /api/workspaces/recover?token=…` | Exchange token for workspace credentials |
| `DELETE /api/workspaces/recovery/[id]` | Revoke a recovery token |

Rate-limit recovery creation and exchange by IP (reuse `lib/rate-limit`).

## UI: where “Save this workspace” should appear

1. **Settings panel** (`app/ui/settings/settings-panel.tsx`) — primary placement under “Current workspace”, after rename. Copy: “Save a recovery link to open this workspace on another device.”
2. **After first successful document ingest** — one-time subtle banner or dialog CTA (non-blocking).
3. **Workspace switcher** (`app/ui/workspace/workspace-switcher.tsx`) — optional menu item on each workspace row.

Do not show recovery UI until the API exists; use TODO comments at these locations.

## Security notes

- Store only `token_hash` (same pattern as `workspaces.secret_hash`).
- Recovery tokens are high-value secrets — treat like passwords in logs and analytics.
- Single-use or short TTL reduces leak risk.
- Rotating workspace secret on recovery invalidates old browser sessions (acceptable tradeoff).

## Related env

- `NEXT_PUBLIC_APP_URL` — already in `.env.example` for recovery link base URL.
