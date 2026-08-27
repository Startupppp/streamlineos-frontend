const CHUNK_PATTERN =
  /chunkloaderror|loading chunk \S+ failed|(?:failed|error) (?:to fetch|loading) dynamically imported module|importing a module script failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_PATTERN.test(error.message);
}
