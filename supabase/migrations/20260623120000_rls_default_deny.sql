-- Launch hardening: default-deny RLS on all application tables and storage.
-- The Next.js API uses the service role, which bypasses RLS. anon/authenticated
-- clients must not read or write workspace data directly via PostgREST.

-- ---------------------------------------------------------------------------
-- Public schema tables
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;

alter table public.sources enable row level security;
alter table public.sources force row level security;

alter table public.documents enable row level security;
alter table public.documents force row level security;

alter table public.chunks enable row level security;
alter table public.chunks force row level security;

alter table public.messages enable row level security;
alter table public.messages force row level security;

alter table public.waitlist_emails enable row level security;
alter table public.waitlist_emails force row level security;

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;

alter table public.workspace_recovery_tokens enable row level security;
alter table public.workspace_recovery_tokens force row level security;

-- Revoke direct table privileges from API-facing roles (defense in depth with RLS).
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.sources from anon, authenticated;
revoke all on table public.documents from anon, authenticated;
revoke all on table public.chunks from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.waitlist_emails from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.workspace_recovery_tokens from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vector search RPC — service role only
-- ---------------------------------------------------------------------------

revoke all on function public.match_chunks(vector, integer, uuid, uuid, uuid) from public;
revoke all on function public.match_chunks(vector, integer, uuid, uuid, uuid) from anon;
revoke all on function public.match_chunks(vector, integer, uuid, uuid, uuid) from authenticated;
grant execute on function public.match_chunks(vector, integer, uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Storage — private uploads bucket; no client policies
-- ---------------------------------------------------------------------------
-- Hosted Supabase already enables RLS on storage.objects/buckets, and the
-- migration role is not owner of those tables, so skip ALTER here.

revoke all on table storage.objects from anon, authenticated;
revoke all on table storage.buckets from anon, authenticated;
