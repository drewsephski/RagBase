import { describe, expect, test } from "@jest/globals";
import type { ContextBlock } from "@/lib/retrieval/context";
import {
  citationsToDisplay,
  getDisplayContent,
  getMessageDisplayCitations,
  parseCitationsFromResponse,
  parseDisplayCitationsFromContent,
  stripCitationsBlock,
} from "@/lib/chat/citations/parse";

const CHUNK_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";

const contextBlocks: ContextBlock[] = [
  {
    ref: 1,
    chunkId: CHUNK_ID,
    sourceId: SOURCE_ID,
    sourceName: "sample.txt",
    documentId: "44444444-4444-4444-8444-444444444444",
    chunkIndex: 0,
    pageNumber: null,
    sourceLocation: null,
    text: "The secret phrase is purple elephant forty-two.",
    similarity: 0.9,
  },
];

describe("stripCitationsBlock", () => {
  test("removes citations block from content", () => {
    const raw =
      'Answer text [1].\n<citations>[{"ref":1,"chunkId":"11111111-1111-4111-8111-111111111111","snippet":"quote"}]</citations>';

    expect(stripCitationsBlock(raw)).toBe("Answer text [1].");
  });
});

describe("getDisplayContent", () => {
  test("returns content without citations block", () => {
    const raw = `Visible answer.\n<citations>[]</citations>`;
    expect(getDisplayContent(raw)).toBe("Visible answer.");
  });
});

describe("parseDisplayCitationsFromContent", () => {
  test("parses structured citations block", () => {
    const raw = `Answer [1].\n<citations>[{"ref":1,"chunkId":"${CHUNK_ID}","snippet":"purple elephant forty-two"}]</citations>`;

    expect(parseDisplayCitationsFromContent(raw)).toEqual([
      {
        ref: 1,
        chunkId: CHUNK_ID,
        snippet: "purple elephant forty-two",
      },
    ]);
  });

  test("returns empty array when citations block is missing", () => {
    expect(parseDisplayCitationsFromContent("Answer with [1] only.")).toEqual([]);
  });

  test("does not synthesize citations from inline markers", () => {
    expect(parseDisplayCitationsFromContent("Claim [1] without a block.")).toEqual(
      [],
    );
  });
});

describe("parseCitationsFromResponse", () => {
  test("enriches citations from context blocks", () => {
    const raw = `Answer [1].\n<citations>[{"ref":1,"chunkId":"${CHUNK_ID}","snippet":"purple elephant forty-two"}]</citations>`;

    const result = parseCitationsFromResponse(raw, contextBlocks);

    expect(result.content).toBe("Answer [1].");
    expect(result.citations).toEqual([
      {
        chunkId: CHUNK_ID,
        sourceId: SOURCE_ID,
        sourceName: "sample.txt",
        pageNumber: null,
        snippet: "purple elephant forty-two",
        context: "The secret phrase is purple elephant forty-two.",
      },
    ]);
  });

  test("skips citations whose chunk is not in context", () => {
    const unknownChunk = "33333333-3333-4333-8333-333333333333";
    const raw = `<citations>[{"ref":1,"chunkId":"${unknownChunk}","snippet":"orphan"}]</citations>`;

    expect(parseCitationsFromResponse(raw, contextBlocks).citations).toEqual([]);
  });
});

describe("getMessageDisplayCitations", () => {
  test("prefers persisted citations over content parsing", () => {
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

    expect(getMessageDisplayCitations("No block here.", persisted)).toEqual(
      citationsToDisplay(persisted),
    );
  });
});
