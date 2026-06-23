import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/domain/definitions";

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

export function resolveEmbeddingApiKey(apiKey?: string): string {
  const resolvedKey = apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();

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

function createRateLimitError(): Error {
  return new Error(
    "OpenRouter rate limit reached while reading this document. Try again shortly.",
  );
}

async function fetchEmbeddingsFromOpenRouter(
  values: string[],
  apiKey: string,
): Promise<number[][]> {
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

    if (response.status === 429) {
      throw createRateLimitError();
    }

    throw new Error(
      `OpenRouter embedding request failed (${response.status}): ${errorBody.slice(0, 120)}`,
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

  return embeddings;
}

export async function embedTexts(
  texts: string[],
  options: EmbedOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = resolveEmbeddingApiKey(options.apiKey);
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const batchEmbeddings = await fetchEmbeddingsFromOpenRouter(batch, apiKey);
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

export async function embedQuery(
  text: string,
  apiKey?: string,
): Promise<number[]> {
  const resolvedKey = resolveEmbeddingApiKey(apiKey);
  const [embedding] = await fetchEmbeddingsFromOpenRouter([text], resolvedKey);

  if (!embedding) {
    throw new Error("Embedding provider returned no vector");
  }

  return embedding;
}

/** @deprecated Use embedQuery instead. */
export async function fetchEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  return embedQuery(text, apiKey);
}
