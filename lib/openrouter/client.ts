import { DEFAULT_MODEL } from "@/lib/domain/definitions";
import { resolveEmbeddingApiKey } from "@/lib/openrouter/embeddings";

function createOpenRouterProvider(apiKey: string) {
  // Lazy-loaded so embedding-only imports avoid the AI SDK stream stack in Jest.
  const { createOpenRouter } =
    require("@openrouter/ai-sdk-provider") as typeof import("@openrouter/ai-sdk-provider");

  return createOpenRouter({ apiKey });
}

export function createOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  return createOpenRouterProvider(apiKey);
}

export function createOpenRouterWithKey(apiKey: string) {
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is required");
  }

  return createOpenRouterProvider(apiKey.trim());
}

export function createChatModel(apiKey: string, model?: string) {
  const openrouter = createOpenRouterProvider(apiKey);
  return openrouter.chat(model ?? DEFAULT_MODEL);
}

export function getServerApiKey(): string {
  return resolveEmbeddingApiKey();
}

export { embedQuery } from "@/lib/openrouter/embeddings";
