import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { checkSourceLimit } from "@/lib/limits";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import {
  normalizeUrl,
  scrapeUrl,
  UrlScrapeError,
} from "@/lib/ingestion/url";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

const urlBodySchema = z.object({
  url: z.string().min(1),
});

const UPLOADS_BUCKET = "uploads";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await checkSourceLimit(workspace.id);

    const body: unknown = await request.json();
    const parsed = urlBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid URL", 400);
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(parsed.data.url);
    } catch (error) {
      if (error instanceof UrlScrapeError) {
        return jsonError(error.message, 400);
      }
      throw error;
    }

    let scraped;
    try {
      scraped = await scrapeUrl(normalizedUrl);
    } catch (error) {
      if (error instanceof UrlScrapeError) {
        return jsonError(error.message, 422);
      }

      console.error("URL scrape failed:", error);
      return jsonError(
        "Could not fetch content from this URL. Check that it is public and try again.",
        422,
      );
    }

    const supabase = createServiceClient();
    const storagePath = `${workspace.id}/urls/${Date.now()}.md`;

    const { error: uploadError } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(storagePath, scraped.markdown, {
        contentType: "text/markdown",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to store scraped content:", uploadError);
      return jsonError("Failed to store scraped content", 500);
    }

    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        workspace_id: workspace.id,
        type: "url",
        name: scraped.title,
        status: "pending",
        storage_path: storagePath,
        metadata: {
          url: scraped.url,
          title: scraped.title,
          scrapedAt: new Date().toISOString(),
        },
      })
      .select("id, name, status, type, created_at")
      .single();

    if (insertError || !source) {
      await supabase.storage.from(UPLOADS_BUCKET).remove([storagePath]);
      return jsonError("Failed to create source record", 500);
    }

    try {
      await runIngestionPipeline(source.id);
    } catch (pipelineError) {
      console.error("URL ingestion pipeline failed:", pipelineError);
    }

    const { data: updatedSource } = await supabase
      .from("sources")
      .select("id, name, status, type, created_at, error_message")
      .eq("id", source.id)
      .single();

    return Response.json({ source: updatedSource ?? source }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
