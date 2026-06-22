import { generateObject } from "ai";
import { z } from "zod";

import {
  DEFAULT_MODEL,
  type StarterQuestion,
} from "@/app/lib/definitions";
import {
  getWorkspaceTemplate,
  parseTemplateId,
  type TemplateId,
} from "@/app/lib/templates";
import {
  createOpenRouter,
  createOpenRouterWithKey,
} from "@/lib/openrouter/client";
import { createServiceClient } from "@/lib/supabase/server";

export const STARTER_QUESTIONS_PER_SOURCE = 2;

function staticStarterQuestions(): StarterQuestion[] {
  const questions = [
    "Summarize this document in plain English",
    "What are the key points I should know?",
  ];

  return questions.map((text, index) => ({
    id: `starter-${index + 1}`,
    text,
  }));
}

const starterResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(8).max(120),
      }),
    )
    .length(STARTER_QUESTIONS_PER_SOURCE),
});

export interface GenerateStarterQuestionsOptions {
  sourceName: string;
  chunkTexts: string[];
  apiKey?: string;
  templateId?: TemplateId;
}

function buildStarterPrompt(options: {
  sourceName: string;
  sampleText: string;
  templateId?: TemplateId;
}): string {
  const { sourceName, sampleText, templateId } = options;
  const template = templateId ? getWorkspaceTemplate(templateId) : null;

  const audienceHint = template?.starterAudienceHint ??
    "Questions should be practical for a consumer (summarize, find key terms, explain in plain English, compare sections, etc.).";

  return `Generate exactly ${STARTER_QUESTIONS_PER_SOURCE} short starter questions a user might ask about this document.

Document title: "${sourceName}"

Document excerpt:
${sampleText || "(No text available)"}

Requirements:
- ${audienceHint}
- Keep each question under 120 characters.
- Use plain language. No technical jargon.`;
}

function buildSampleText(chunkTexts: string[], maxChars = 4000): string {
  let combined = "";

  for (const chunk of chunkTexts) {
    if (combined.length >= maxChars) {
      break;
    }

    combined += `${chunk.trim()}\n\n`;
  }

  return combined.slice(0, maxChars).trim();
}

export async function generateStarterQuestions(
  options: GenerateStarterQuestionsOptions,
): Promise<StarterQuestion[]> {
  const { sourceName, chunkTexts, apiKey, templateId } = options;
  const sampleText = buildSampleText(chunkTexts);

  const openrouter = apiKey
    ? createOpenRouterWithKey(apiKey)
    : createOpenRouter();

  try {
    const { object } = await generateObject({
      model: openrouter.chat(DEFAULT_MODEL),
      schema: starterResponseSchema,
      prompt: buildStarterPrompt({ sourceName, sampleText, templateId }),
    });

    return object.questions.map((question, index) => ({
      id: `starter-${index + 1}`,
      text: question.text,
    }));
  } catch (error) {
    console.error("Starter question generation failed, using defaults:", error);
    return staticStarterQuestions();
  }
}

export async function generateStarterQuestionsForSource(
  sourceId: string,
  options?: { apiKey?: string; templateId?: TemplateId },
): Promise<StarterQuestion[]> {
  const supabase = createServiceClient();

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, name, status")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !source) {
    throw new Error("Source not found");
  }

  if (source.status !== "ready") {
    throw new Error("Source is not ready yet");
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id")
    .eq("source_id", sourceId);

  if (documentsError) {
    throw new Error("Failed to load source documents");
  }

  const documentIds = (documents ?? []).map((document) => document.id);
  let chunkTexts: string[] = [];

  if (documentIds.length > 0) {
    const { data: chunks, error: chunksError } = await supabase
      .from("chunks")
      .select("chunk_text")
      .in("document_id", documentIds)
      .limit(8);

    if (chunksError) {
      throw new Error("Failed to load source chunks");
    }

    chunkTexts = (chunks ?? []).map((chunk) => chunk.chunk_text);
  }

  return generateStarterQuestions({
    sourceName: source.name,
    chunkTexts,
    apiKey: options?.apiKey,
    templateId: options?.templateId,
  });
}

export function parseStarterTemplateId(
  value: string | null | undefined,
): TemplateId | undefined {
  const parsed = parseTemplateId(value);
  return parsed ?? undefined;
}
