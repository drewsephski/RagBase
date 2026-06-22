import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/app/lib/definitions";

interface OpenRouterEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

export async function fetchEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Embedding request failed: ${errorBody || response.statusText}`,
    );
  }

  const payload = (await response.json()) as OpenRouterEmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Embedding provider returned an invalid vector");
  }

  return embedding;
}
