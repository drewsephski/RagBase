import { z } from "zod";
import { templateIdSchema, type TemplateId } from "@/lib/domain/templates";

export interface CreateWorkspaceOptions {
  name?: string;
  templateId?: TemplateId;
}

export const sourceTypeSchema = z.enum(["file", "url"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const sourceStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "error",
]);
export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const planSchema = z.enum(["anonymous", "free", "paid_future"]);
export type Plan = z.infer<typeof planSchema>;

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  plan: planSchema,
  name: z.string().nullable().optional(),
  owner_user_id: z.string().nullable().optional(),
  message_count: z.number(),
  message_count_date: z.string().nullable(),
  last_seen_at: z.string(),
  created_at: z.string(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const storedWorkspaceSchema = z.object({
  id: z.string().uuid(),
  secret: z.string().min(32),
  name: z.string().min(1).max(64),
  createdAt: z.string(),
  templateId: templateIdSchema.optional(),
});
export type StoredWorkspace = z.infer<typeof storedWorkspaceSchema>;

export const DEFAULT_WORKSPACE_NAME = "My workspace";
export const UNTITLED_WORKSPACE_NAME = "Untitled workspace";

export const ingestionErrorCategorySchema = z.enum([
  "scanned_pdf",
  "ocr_over_cap",
  "ocr_provider_error",
  "oversized_file",
  "too_many_pages",
  "blocked_url",
  "unsupported_type",
  "empty_content",
  "service_unavailable",
  "unknown",
]);
export type IngestionErrorCategory = z.infer<typeof ingestionErrorCategorySchema>;

export const sourceMetadataSchema = z
  .object({
    ingestionPhase: z.literal("ocr").nullable().optional(),
    errorCategory: ingestionErrorCategorySchema.nullable().optional(),
  })
  .passthrough();
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;

export function parseSourceMetadata(
  metadata: Record<string, unknown> | null | undefined,
): SourceMetadata {
  const parsed = sourceMetadataSchema.safeParse(metadata ?? {});
  return parsed.success ? parsed.data : {};
}

export function isSourceOcrProcessing(source: {
  status: SourceStatus;
  metadata: SourceMetadata | null;
}): boolean {
  if (source.status !== "processing") {
    return false;
  }

  return parseSourceMetadata(
    source.metadata as Record<string, unknown> | null | undefined,
  ).ingestionPhase === "ocr";
}

export const sourceSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  type: sourceTypeSchema,
  name: z.string(),
  status: sourceStatusSchema,
  storage_path: z.string().nullable(),
  metadata: sourceMetadataSchema.nullable(),
  error_message: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  raw_text: z.string(),
  page_count: z.number().nullable(),
  token_count: z.number().nullable(),
});
export type Document = z.infer<typeof documentSchema>;

export const chunkSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  chunk_text: z.string(),
  chunk_index: z.number().int().nonnegative(),
  page_number: z.number().nullable(),
  source_location: z.string().nullable(),
});
export type Chunk = z.infer<typeof chunkSchema>;

export const citationSchema = z.object({
  chunkId: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceName: z.string(),
  pageNumber: z.number().nullable(),
  snippet: z.string(),
  context: z.string().optional(),
});
export type Citation = z.infer<typeof citationSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  citations: z.array(citationSchema).nullable(),
  model: z.string().nullable(),
  source_scope: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const workspaceCredentialsSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceSecret: z.string().min(32),
});
export type WorkspaceCredentials = z.infer<typeof workspaceCredentialsSchema>;

export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const DEFAULT_MODEL = "google/gemini-2.5-flash";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export const LIMITS = {
  MAX_SOURCES: 5,
  MAX_WORKSPACES: 10,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  MAX_PDF_PAGES: 50,
  MAX_MESSAGES_DAY: 30,
  MAX_MESSAGES_DAY_WITH_KEY: 200,
  RETENTION_DAYS: 14,
  LOW_TEXT_CHARS_PER_PAGE: 50,
  OCR_PAGES_FREE: 10,
  OCR_PAGES_BYOK: 50,
} as const;

export type FormState = {
  message?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
};

export const starterQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  sourceName: z.string().optional(),
});
export type StarterQuestion = z.infer<typeof starterQuestionSchema>;
