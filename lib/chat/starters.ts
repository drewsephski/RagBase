import { generateObject } from "ai";
import { z } from "zod";

import {
  DEFAULT_MODEL,
  type StarterQuestion,
} from "@/app/lib/definitions";
import {
  createOpenRouter,
  createOpenRouterWithKey,
} from "@/lib/openrouter/client";
import { createServiceClient } from "@/lib/supabase/server";

const CONTRACT_KEYWORDS =
  /\b(contract|lease|agreement|terms\s+of\s+service|nda|warranty|indemnif)/i;

const LEGAL_DISCLAIMER =
  "I can help explain and summarize this document, but I'm not a lawyer.";

function staticStarterQuestions(
  _sourceName: string,
  contractLike: boolean,
): StarterQuestion[] {
  const questions = [
    "Summarize this document in plain English",
    "What are the key points I should know?",
    "Are there any important dates or deadlines?",
    "Explain the most important terms simply",
  ];

  return questions.map((text, index) => ({
    id: `starter-${index + 1}`,
    text,
    ...(contractLike && index === 0 ? { disclaimer: LEGAL_DISCLAIMER } : {}),
  }));
}

const starterResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(8).max(120),
        includeDisclaimer: z.boolean().optional(),
      }),
    )
    .min(4)
    .max(6),
});

export interface GenerateStarterQuestionsOptions {
  sourceName: string;
  chunkTexts: string[];
  apiKey?: string;
}

function isContractLike(sourceName: string, sampleText: string): boolean {
  return (
    CONTRACT_KEYWORDS.test(sourceName) || CONTRACT_KEYWORDS.test(sampleText)
  );
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
  const { sourceName, chunkTexts, apiKey } = options;
  const sampleText = buildSampleText(chunkTexts);
  const contractLike = isContractLike(sourceName, sampleText);

  const openrouter = apiKey
    ? createOpenRouterWithKey(apiKey)
    : createOpenRouter();

  try {
    const { object } = await generateObject({
      model: openrouter.chat(DEFAULT_MODEL),
      schema: starterResponseSchema,
      prompt: `Generate 4-6 short starter questions a user might ask about this document.

Document title: "${sourceName}"

Document excerpt:
${sampleText || "(No text available)"}

Requirements:
- Questions should be practical for a consumer (summarize, find key terms, explain in plain English, compare sections, etc.).
- Keep each question under 120 characters.
- Use plain language. No technical jargon.
${contractLike ? `- This appears to be a contract or legal document. Mark at least one question with includeDisclaimer: true.` : ""}`,
    });

    return object.questions.map((question, index) => {
      const needsDisclaimer =
        question.includeDisclaimer === true ||
        (contractLike && index === 0 && question.includeDisclaimer !== false);

      return {
        id: `starter-${index + 1}`,
        text: question.text,
        ...(needsDisclaimer ? { disclaimer: LEGAL_DISCLAIMER } : {}),
      };
    });
  } catch (error) {
    console.error("Starter question generation failed, using defaults:", error);
    return staticStarterQuestions(sourceName, contractLike);
  }
}

export async function generateStarterQuestionsForSource(
  sourceId: string,
  options?: { apiKey?: string },
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
  });
}
