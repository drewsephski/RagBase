-- Enable pgvector
create extension if not exists vector;

-- Workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  plan text not null default 'anonymous' check (plan in ('anonymous', 'free', 'paid_future')),
  message_count integer not null default 0,
  message_count_date date,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists workspaces_last_seen_at_idx on workspaces (last_seen_at);

-- Sources
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('file', 'url')),
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  storage_path text,
  metadata jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists sources_workspace_id_idx on sources (workspace_id);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  raw_text text not null default '',
  page_count integer,
  token_count integer
);

create index if not exists documents_source_id_idx on documents (source_id);

-- Chunks with embeddings
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  page_number integer,
  source_location text
);

create index if not exists chunks_document_id_idx on chunks (document_id);
create index if not exists chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  model text,
  source_scope uuid references sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_workspace_id_idx on messages (workspace_id, created_at desc);

-- Vector similarity search helper
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_workspace_id uuid,
  filter_source_id uuid default null
)
returns table (
  id uuid,
  chunk_text text,
  page_number integer,
  source_location text,
  source_id uuid,
  source_name text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.chunk_text,
    c.page_number,
    c.source_location,
    s.id as source_id,
    s.name as source_name,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  join sources s on s.id = d.source_id
  where s.workspace_id = filter_workspace_id
    and s.status = 'ready'
    and (filter_source_id is null or s.id = filter_source_id)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Storage bucket (run via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);
