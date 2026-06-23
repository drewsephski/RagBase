import { generateObject } from "ai";
import { z } from "zod";

import {
  DEFAULT_MODEL,
  type StarterQuestion,
} from "@/lib/domain/definitions";
import {
  getWorkspaceTemplate,
  parseTemplateId,
  type TemplateId,
} from "@/lib/domain/templates";
import {
  createOpenRouter,
  createOpenRouterWithKey,
} from "@/lib/openrouter/client";

export const STARTER_QUESTIONS_PER_SOURCE = 4;

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

export function parseStarterTemplateId(
  value: string | null | undefined,
): TemplateId | undefined {
  const parsed = parseTemplateId(value);
  return parsed ?? undefined;
}
