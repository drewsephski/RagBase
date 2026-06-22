export interface TextSegment {
  text: string;
  pageNumber: number | null;
  sourceLocation?: string | null;
}

export interface TextChunk {
  text: string;
  pageNumber: number | null;
  sourceLocation: string | null;
  tokenCount: number;
}

export const CHUNK_TARGET_TOKENS = 500;
export const CHUNK_OVERLAP_TOKENS = 50;

const CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function targetChars(tokenCount: number): number {
  return tokenCount * CHARS_PER_TOKEN;
}

function findWordBoundary(text: string, start: number, end: number): number {
  if (end >= text.length) {
    return text.length;
  }

  const minBreak = start + Math.floor((end - start) * 0.5);
  const lastSpace = text.lastIndexOf(" ", end);

  if (lastSpace >= minBreak) {
    return lastSpace;
  }

  return end;
}

interface MappedCharacter {
  pageNumber: number | null;
  sourceLocation: string | null;
}

function buildMappedText(segments: TextSegment[]): {
  text: string;
  mapping: MappedCharacter[];
} {
  let text = "";
  const mapping: MappedCharacter[] = [];

  for (const segment of segments) {
    const normalized = segment.text.replace(/\r\n/g, "\n");
    const sourceLocation = segment.sourceLocation ?? null;

    for (let index = 0; index < normalized.length; index += 1) {
      mapping.push({
        pageNumber: segment.pageNumber,
        sourceLocation,
      });
    }

    text += normalized;

    if (!normalized.endsWith("\n")) {
      text += "\n";
      mapping.push({
        pageNumber: segment.pageNumber,
        sourceLocation,
      });
    }
  }

  return { text, mapping };
}

export function chunkText(segments: TextSegment[]): TextChunk[] {
  const nonEmptySegments = segments
    .map((segment) => ({
      ...segment,
      text: segment.text.trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  if (nonEmptySegments.length === 0) {
    return [];
  }

  const { text, mapping } = buildMappedText(nonEmptySegments);

  if (text.trim().length === 0) {
    return [];
  }

  const targetSize = targetChars(CHUNK_TARGET_TOKENS);
  const overlapSize = targetChars(CHUNK_OVERLAP_TOKENS);
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + targetSize, text.length);

    if (end < text.length) {
      end = findWordBoundary(text, start, end);
    }

    const chunkTextValue = text.slice(start, end).trim();

    if (chunkTextValue.length > 0) {
      const mappingIndex = Math.min(start, Math.max(mapping.length - 1, 0));
      const pageInfo = mapping[mappingIndex] ?? {
        pageNumber: null,
        sourceLocation: null,
      };

      chunks.push({
        text: chunkTextValue,
        pageNumber: pageInfo.pageNumber,
        sourceLocation: pageInfo.sourceLocation,
        tokenCount: estimateTokenCount(chunkTextValue),
      });
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(start + 1, end - overlapSize);
  }

  return chunks;
}

export function chunkPlainText(
  text: string,
  sourceLocation: string | null = null,
): TextChunk[] {
  return chunkText([
    {
      text,
      pageNumber: null,
      sourceLocation,
    },
  ]);
}
