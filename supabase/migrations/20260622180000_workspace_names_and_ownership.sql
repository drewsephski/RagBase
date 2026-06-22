alter table workspaces
  add column if not exists name text,
  add column if not exists owner_user_id text;

create index if not exists workspaces_owner_user_id_idx
  on workspaces (owner_user_id)
  where owner_user_id is not null;
