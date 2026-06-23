-- Phase 6d: per-page crawl documents + document-scoped retrieval

alter table documents
  add column if not exists url text,
  add column if not exists title text,
  add column if not exists path text,
  add column if not exists status text
    check (status is null or status in ('pending', 'processing', 'ready', 'error'));

create index if not exists documents_source_id_status_idx
  on documents (source_id, status);

drop function if exists public.match_chunks(vector, integer, uuid, uuid);

create function public.match_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_workspace_id uuid,
  filter_source_id uuid default null,
  filter_document_id uuid default null
)
returns table (
  id uuid,
  chunk_text text,
  page_number integer,
  source_location text,
  source_id uuid,
  source_name text,
  document_id uuid,
  chunk_index integer,
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
    d.id as document_id,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  join sources s on s.id = d.source_id
  where s.workspace_id = filter_workspace_id
    and s.status = 'ready'
    and (filter_source_id is null or s.id = filter_source_id)
    and (filter_document_id is null or d.id = filter_document_id)
    and (d.status is null or d.status = 'ready')
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
