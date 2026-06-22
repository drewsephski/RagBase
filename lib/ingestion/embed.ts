import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedMany } from "ai";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/app/lib/definitions";

export interface EmbedOptions {
  apiKey?: string;
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 32;
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

interface OpenRouterEmbeddingItem {
  embedding: number[];
  index: number;
}

interface OpenRouterEmbeddingsResponse {
  data: OpenRouterEmbeddingItem[];
  usage?: {
    prompt_tokens?: number;
  };
}

function getOpenRouterApiKey(apiKey?: string): string {
  const resolvedKey = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!resolvedKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  return resolvedKey;
}

function assertEmbeddingDimensions(embedding: number[]): void {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding size: expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}`,
    );
  }
}

function createOpenRouterEmbeddingModel(apiKey: string) {
  createOpenRouter({ apiKey });

  return {
    specificationVersion: "v1" as const,
    provider: "openrouter",
    modelId: EMBEDDING_MODEL,
    maxEmbeddingsPerCall: DEFAULT_BATCH_SIZE,
    supportsParallelCalls: true,
    doEmbed: async ({
      values,
    }: {
      values: string[];
      abortSignal?: AbortSignal;
      headers?: Record<string, string | undefined>;
    }) => {
      const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: values,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenRouter embedding request failed (${response.status}): ${errorBody}`,
        );
      }

      const payload = (await response.json()) as OpenRouterEmbeddingsResponse;
      const embeddings = payload.data
        .slice()
        .sort((left, right) => left.index - right.index)
        .map((item) => item.embedding);

      for (const embedding of embeddings) {
        assertEmbeddingDimensions(embedding);
      }

      return {
        embeddings,
        usage: payload.usage?.prompt_tokens
          ? { tokens: payload.usage.prompt_tokens }
          : undefined,
      };
    },
  };
}

export async function embedTexts(
  texts: string[],
  options: EmbedOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = getOpenRouterApiKey(options.apiKey);
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const model = createOpenRouterEmbeddingModel(apiKey);
  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const { embeddings: batchEmbeddings } = await embedMany({
      model,
      values: batch,
    });

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

export async function embedText(
  text: string,
  options: EmbedOptions = {},
): Promise<number[]> {
  const [embedding] = await embedTexts([text], options);

  if (!embedding) {
    throw new Error("Embedding provider returned no vector");
  }

  return embedding;
}
