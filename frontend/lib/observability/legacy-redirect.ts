const counts = new Map<string, number>();

export function recordLegacyRedirect(source: string, destination: string): number {
  const hits = (counts.get(source) ?? 0) + 1;
  counts.set(source, hits);
  console.info(
    JSON.stringify({
      event: "legacy_redirect",
      source,
      destination,
      hits,
    }),
  );
  return hits;
}

export function legacyRedirectHits(source: string): number {
  return counts.get(source) ?? 0;
}

export function observedLegacyRedirectSources(): string[] {
  return [...counts.keys()].sort();
}

export function resetLegacyRedirectCounts(): void {
  counts.clear();
}
