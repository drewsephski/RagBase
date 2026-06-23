import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/domain/definitions";
import {
  embedQuery,
  embedTexts,
  resolveEmbeddingApiKey,
} from "@/lib/openrouter/embeddings";

describe("OpenRouter embeddings", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "server-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  test("resolveEmbeddingApiKey prefers an explicit key", () => {
    expect(resolveEmbeddingApiKey(" user-key ")).toBe("user-key");
  });

  test("resolveEmbeddingApiKey falls back to the environment", () => {
    expect(resolveEmbeddingApiKey()).toBe("server-key");
  });

  test("embedQuery returns a validated embedding vector", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.25);

    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: vector, index: 0 }],
      }),
    } as Response);

    const result = await embedQuery("hello world");

    expect(result).toEqual(vector);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: ["hello world"],
        }),
      }),
    );
  });

  test("embedQuery surfaces rate-limit failures consistently", async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    } as Response);

    await expect(embedQuery("hello")).rejects.toThrow(/rate limit/i);
  });

  test("embedQuery rejects invalid vector dimensions", async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2], index: 0 }],
      }),
    } as Response);

    await expect(embedQuery("hello")).rejects.toThrow(/embedding size/i);
  });

  test("embedTexts batches through the shared OpenRouter request path", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.5);

    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { embedding: vector, index: 0 },
          { embedding: vector, index: 1 },
        ],
      }),
    } as Response);

    const result = await embedTexts(["first chunk", "second chunk"], {
      batchSize: 32,
    });

    expect(result).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
