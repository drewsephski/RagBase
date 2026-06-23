import { chunkPlainText, estimateTokenCount } from "@/lib/ingestion/chunk";
import { embedTexts } from "@/lib/ingestion/embed";
import type { CrawlPageSnapshot } from "@/lib/ingestion/crawl/firecrawl-crawl";
import { createServiceClient } from "@/lib/supabase/server";

export async function ingestCrawlPage(
  sourceId: string,
  page: CrawlPageSnapshot,
): Promise<boolean> {
  if (page.failed || page.markdown.trim().length === 0) {
    return false;
  }

  const supabase = createServiceClient();
  const chunks = chunkPlainText(page.markdown, page.url);

  if (chunks.length === 0) {
    return false;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      source_id: sourceId,
      raw_text: page.markdown,
      page_count: null,
      token_count: estimateTokenCount(page.markdown),
      url: page.url,
      title: page.title,
      path: page.path,
      status: "ready",
    })
    .select("id")
    .single();

  if (documentError || !document) {
    console.error("Failed to store crawl page document:", documentError);
    return false;
  }

  const chunkRows = chunks.map((chunk, index) => {
    const embedding = embeddings[index];
    if (!embedding) {
      throw new Error(`Missing embedding for crawl page chunk ${index + 1}`);
    }

    return {
      document_id: document.id,
      chunk_text: chunk.text,
      page_number: chunk.pageNumber,
      source_location: chunk.sourceLocation ?? page.url,
      chunk_index: index,
      embedding,
    };
  });

  const { error: chunkError } = await supabase.from("chunks").insert(chunkRows);

  if (chunkError) {
    console.error("Failed to store crawl page chunks:", chunkError);
    await supabase.from("documents").delete().eq("id", document.id);
    return false;
  }

  return true;
}

export async function listCrawlPages(sourceId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, path, url, status")
    .eq("source_id", sourceId)
    .order("path", { ascending: true });

  if (error) {
    throw new Error(`Failed to list crawl pages: ${error.message}`);
  }

  return data ?? [];
}
