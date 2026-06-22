const CITATIONS_BLOCK_REGEX = /<citations>([\s\S]*?)<\/citations>/i;

export interface ParsedMessageCitation {
  ref: number;
  chunkId: string;
  snippet: string;
}

export function stripCitationsBlock(content: string): string {
  return content.replace(CITATIONS_BLOCK_REGEX, "").trim();
}

export function parseMessageCitations(content: string): ParsedMessageCitation[] {
  const match = content.match(CITATIONS_BLOCK_REGEX);

  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;

      if (Array.isArray(parsed)) {
        const structured = parsed
          .filter(
            (item): item is ParsedMessageCitation =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as ParsedMessageCitation).ref === "number" &&
              typeof (item as ParsedMessageCitation).chunkId === "string" &&
              typeof (item as ParsedMessageCitation).snippet === "string",
          )
          .map((item) => ({
            ref: item.ref,
            chunkId: item.chunkId,
            snippet: item.snippet.trim(),
          }));

        if (structured.length > 0) {
          return structured;
        }
      }
    } catch {
      // Fall through to inline citation parsing.
    }
  }

  return parseInlineCitationMarkers(content);
}

function parseInlineCitationMarkers(content: string): ParsedMessageCitation[] {
  const displayContent = stripCitationsBlock(content);
  const refs = [...displayContent.matchAll(/\[(\d+)\]/g)];

  if (refs.length === 0) {
    return [];
  }

  const seen = new Set<number>();

  return refs.flatMap((refMatch) => {
    const ref = Number(refMatch[1]);
    if (seen.has(ref)) {
      return [];
    }

    seen.add(ref);

    const index = refMatch.index ?? 0;
    const before = displayContent.slice(0, index);
    const sentenceStart = Math.max(
      before.lastIndexOf(". ") + 2,
      before.lastIndexOf("\n") + 1,
      0,
    );
    const after = displayContent.slice(index);
    const sentenceEndMatch = after.search(/\n|\.\s/);
    const sentenceEnd =
      sentenceEndMatch === -1 ? displayContent.length : index + sentenceEndMatch;
    const snippet = displayContent
      .slice(sentenceStart, sentenceEnd)
      .replace(/\[\d+\]/g, "")
      .trim();

    if (!snippet) {
      return [];
    }

    return [
      {
        ref,
        chunkId: `inline-${ref}`,
        snippet,
      },
    ];
  });
}

export function getDisplayContent(content: string): string {
  return stripCitationsBlock(content);
}
