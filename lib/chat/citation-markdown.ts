const CITATION_MARKER_REGEX = /\[(\d+)\]/g;

export function linkifyCitationMarkers(content: string): string {
  return content.replace(CITATION_MARKER_REGEX, "[$1](#cite-$1)");
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
