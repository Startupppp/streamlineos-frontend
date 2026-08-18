type QueryCacheClearer = () => void;

let activeClearer: QueryCacheClearer | null = null;

export function registerQueryCacheClearer(
  clearer: QueryCacheClearer,
): () => void {
  activeClearer = clearer;
  return () => {
    if (activeClearer === clearer) activeClearer = null;
  };
}

export function clearRegisteredQueryCache(): void {
  activeClearer?.();
}
