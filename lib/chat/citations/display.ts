const CITATION_MARKER_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

export function linkifyCitationMarkers(content: string): string {
  return content.replace(CITATION_MARKER_REGEX, (_match, refsGroup: string) => {
    const refs = refsGroup
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean);

    return refs.map((ref) => `[${ref}](#cite-${ref})`).join(", ");
  });
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
