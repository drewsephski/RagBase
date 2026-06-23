import { CITATIONS_BLOCK_REGEX } from "./constants";

export interface RawCitationItem {
  ref: number;
  chunkId: string;
  snippet: string;
}

export function extractCitationsBlockJson(rawContent: string): string | null {
  const match = rawContent.match(CITATIONS_BLOCK_REGEX);

  if (!match?.[1]) {
    return null;
  }

  return match[1]
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseRawCitationItems(rawContent: string): RawCitationItem[] {
  const json = extractCitationsBlockJson(rawContent);

  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item): RawCitationItem[] => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const ref = (item as { ref?: unknown }).ref;
      const chunkId = (item as { chunkId?: unknown }).chunkId;
      const snippet = (item as { snippet?: unknown }).snippet;

      if (
        typeof ref !== "number" ||
        !Number.isInteger(ref) ||
        ref <= 0
      ) {
        return [];
      }

      if (typeof chunkId !== "string" || chunkId.trim().length === 0) {
        return [];
      }

      if (typeof snippet !== "string" || snippet.trim().length === 0) {
        return [];
      }

      return [
        {
          ref,
          chunkId: chunkId.trim(),
          snippet: snippet.trim(),
        },
      ];
    });
  } catch {
    return [];
  }
}
