const CITATION_MARKER_REGEX =
  /\[\s*(\d+(?:\s*,\s*\d+)*)\s*\](?!\(#cite-\d+\))/g;
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /(`+)(?:(?!\1)[\s\S])*?\1/g;
const CODE_PLACEHOLDER_PREFIX = "\uE000CODE";
const CODE_PLACEHOLDER_SUFFIX = "\uE001";

export function extractCitationRefs(content: string): number[] {
  const refs = new Set<number>();

  for (const segment of splitProtectedSegments(content)) {
    if (segment.type === "code") {
      continue;
    }

    for (const match of segment.value.matchAll(CITATION_MARKER_REGEX)) {
      const refsGroup = match[1];
      if (!refsGroup) {
        continue;
      }

      for (const ref of refsGroup.split(",")) {
        const parsed = Number(ref.trim());
        if (Number.isInteger(parsed) && parsed > 0) {
          refs.add(parsed);
        }
      }
    }
  }

  return Array.from(refs).sort((left, right) => left - right);
}

function splitProtectedSegments(
  content: string,
): Array<{ type: "text" | "code"; value: string }> {
  const segments: Array<{ type: "text" | "code"; value: string }> = [];
  const placeholders: string[] = [];
  let protectedContent = content;

  protectedContent = protectedContent.replace(FENCED_CODE_REGEX, (match) => {
    placeholders.push(match);
    return `${CODE_PLACEHOLDER_PREFIX}${placeholders.length - 1}${CODE_PLACEHOLDER_SUFFIX}`;
  });

  protectedContent = protectedContent.replace(INLINE_CODE_REGEX, (match) => {
    placeholders.push(match);
    return `${CODE_PLACEHOLDER_PREFIX}${placeholders.length - 1}${CODE_PLACEHOLDER_SUFFIX}`;
  });

  const placeholderRegex = new RegExp(
    `${CODE_PLACEHOLDER_PREFIX}(\\d+)${CODE_PLACEHOLDER_SUFFIX}`,
    "g",
  );

  let lastIndex = 0;

  for (const match of protectedContent.matchAll(placeholderRegex)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({
        type: "text",
        value: protectedContent.slice(lastIndex, index),
      });
    }

    const placeholderIndex = Number(match[1]);
    segments.push({
      type: "code",
      value: placeholders[placeholderIndex] ?? "",
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < protectedContent.length) {
    segments.push({
      type: "text",
      value: protectedContent.slice(lastIndex),
    });
  }

  return segments;
}

function linkifyPlainText(content: string): string {
  return content.replace(CITATION_MARKER_REGEX, (_match, refsGroup: string) => {
    const refs = refsGroup
      .split(",")
      .map((ref: string) => ref.trim())
      .filter(Boolean);

    return refs.map((ref) => `[${ref}](#cite-${ref})`).join(", ");
  });
}

export function linkifyCitationMarkers(content: string): string {
  return splitProtectedSegments(content)
    .map((segment) =>
      segment.type === "code"
        ? segment.value
        : linkifyPlainText(segment.value),
    )
    .join("");
}

export function parseCitationLinkHref(
  href: string | undefined,
): number | null {
  if (!href) {
    return null;
  }

  const match = href.match(/^#cite-(\d+)$/);
  if (!match?.[1]) {
    return null;
  }

  return Number(match[1]);
}
