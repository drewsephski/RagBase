import { describe, expect, test } from "@jest/globals";

import { parseRawCitationItems } from "@/lib/chat/citations/block";
import {
  getMessageDisplayCitations,
  parseCitationsFromResponse,
} from "@/lib/chat/citations/parse";
import { resolveStorageCitations } from "@/lib/chat/resolve-storage-citations";
import type { ContextBlock } from "@/lib/retrieval/context";

const CHUNK_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";

const contextBlocks: ContextBlock[] = [
  {
    ref: 1,
    chunkId: CHUNK_ID,
    sourceId: SOURCE_ID,
    sourceName: "docs.example.com (3 pages)",
    documentId: "44444444-4444-4444-8444-444444444444",
    chunkIndex: 0,
    pageNumber: null,
    sourceLocation: "https://docs.example.com/pricing",
    text: "The secret phrase is purple elephant forty-two.",
    similarity: 0.9,
  },
];

describe("parseRawCitationItems", () => {
  test("parses citations when chunkId is not a strict uuid", () => {
    const raw = `Answer [1].\n<citations>[{"ref":1,"chunkId":"not-a-uuid","snippet":"ignored"}]</citations>`;

    expect(parseRawCitationItems(raw)).toEqual([
      {
        ref: 1,
        chunkId: "not-a-uuid",
        snippet: "ignored",
      },
    ]);
  });

  test("parses citations wrapped in a markdown code fence", () => {
    const raw = `Answer [1].\n<citations>\n\`\`\`json\n[{"ref":1,"chunkId":"${CHUNK_ID}","snippet":"purple elephant forty-two"}]\n\`\`\`\n</citations>`;

    expect(parseRawCitationItems(raw)).toEqual([
      {
        ref: 1,
        chunkId: CHUNK_ID,
        snippet: "purple elephant forty-two",
      },
    ]);
  });
});

describe("parseCitationsFromResponse with lenient parsing", () => {
  test("matches context blocks by ref when chunkId is wrong", () => {
    const wrongChunk = "33333333-3333-4333-8333-333333333333";
    const raw = `Answer [1].\n<citations>[{"ref":1,"chunkId":"${wrongChunk}","snippet":"purple elephant forty-two"}]</citations>`;

    expect(parseCitationsFromResponse(raw, contextBlocks).citations).toEqual([
      {
        chunkId: CHUNK_ID,
        sourceId: SOURCE_ID,
        sourceName: "docs.example.com (3 pages)",
        pageNumber: null,
        sourceLocation: "https://docs.example.com/pricing",
        snippet: "purple elephant forty-two",
        context: "The secret phrase is purple elephant forty-two.",
      },
    ]);
  });
});

describe("getMessageDisplayCitations with persisted refs", () => {
  test("preserves citation refs from the citations block", () => {
    const persisted = [
      {
        chunkId: CHUNK_ID,
        sourceId: SOURCE_ID,
        sourceName: "sample.txt",
        pageNumber: null,
        snippet: "stored snippet",
        context: "stored context",
      },
    ];
    const content = `Claim [3].\n<citations>[{"ref":3,"chunkId":"${CHUNK_ID}","snippet":"stored snippet"}]</citations>`;

    expect(getMessageDisplayCitations(content, persisted)).toEqual([
      {
        ref: 3,
        chunkId: CHUNK_ID,
        sourceId: SOURCE_ID,
        sourceName: "sample.txt",
        pageNumber: null,
        snippet: "stored snippet",
        context: "stored context",
      },
    ]);
  });
});

describe("resolveStorageCitations", () => {
  test("falls back to context blocks when chunk lookup is unavailable", async () => {
    const wrongChunk = "33333333-3333-4333-8333-333333333333";
    const raw = `Answer [1].\n<citations>[{"ref":1,"chunkId":"${wrongChunk}","snippet":"purple elephant forty-two"}]</citations>`;

    const supabase = {
      from: () => ({
        select: () => ({
          in: async () => ({ data: [], error: null }),
        }),
      }),
    };

    const result = await resolveStorageCitations(
      supabase as never,
      "55555555-5555-4555-8555-555555555555",
      raw,
      contextBlocks,
    );

    expect(result.citations).toEqual([
      {
        chunkId: CHUNK_ID,
        sourceId: SOURCE_ID,
        sourceName: "docs.example.com (3 pages)",
        pageNumber: null,
        sourceLocation: "https://docs.example.com/pricing",
        snippet: "purple elephant forty-two",
        context: "The secret phrase is purple elephant forty-two.",
      },
    ]);
  });
});
