import { createOpenRouter as createOpenRouterProvider } from "@openrouter/ai-sdk-provider";

import { DEFAULT_MODEL } from "@/app/lib/definitions";
import { fetchEmbedding } from "@/lib/openrouter/embeddings";

export function createOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  return createOpenRouterProvider({ apiKey });
}

export function createOpenRouterWithKey(apiKey: string) {
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is required");
  }

  return createOpenRouterProvider({ apiKey: apiKey.trim() });
}

export function createChatModel(apiKey: string, model?: string) {
  const openrouter = createOpenRouterProvider({ apiKey });
  return openrouter.chat(model ?? DEFAULT_MODEL);
}

export function getServerApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return key;
}

export async function embedQuery(
  text: string,
  apiKey?: string,
): Promise<number[]> {
  const resolvedKey = apiKey ?? getServerApiKey();
  return fetchEmbedding(text, resolvedKey);
}
