-- Track chunk order within a document for adjacent-chunk expansion at retrieval time.
alter table chunks
  add column if not exists chunk_index integer not null default 0;

create index if not exists chunks_document_chunk_idx
  on chunks (document_id, chunk_index);

-- Return document_id and chunk_index from vector search for neighbor expansion.
-- Must drop first: PostgreSQL cannot change a function's return type with CREATE OR REPLACE.
drop function if exists public.match_chunks(vector, integer, uuid, uuid);

create function public.match_chunks(
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
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
