-- Phase 6c: Stripe Pro billing + webhook idempotency

alter table workspaces drop constraint if exists workspaces_plan_check;

update workspaces
set plan = 'anonymous'
where plan = 'paid_future';

alter table workspaces
  add constraint workspaces_plan_check
  check (plan in ('anonymous', 'free', 'pro'));

alter table workspaces
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_current_period_start timestamptz,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists pro_activated_at timestamptz,
  add column if not exists stripe_past_due_at timestamptz,
  add column if not exists recovery_acknowledged_at timestamptz,
  add column if not exists crawl_count_period integer not null default 0,
  add column if not exists crawled_pages_period integer not null default 0,
  add column if not exists crawl_period_start timestamptz;

create index if not exists workspaces_stripe_customer_id_idx
  on workspaces (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists workspaces_stripe_subscription_id_idx
  on workspaces (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists workspace_recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists workspace_recovery_tokens_token_hash_idx
  on workspace_recovery_tokens (token_hash);

create index if not exists workspace_recovery_tokens_workspace_id_idx
  on workspace_recovery_tokens (workspace_id);
