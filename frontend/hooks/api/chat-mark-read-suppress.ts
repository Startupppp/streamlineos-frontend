const suppressAutoMarkReadUntil = new Map<number, number>();

const DEFAULT_SUPPRESS_MS = 60_000;

export function suppressAutoMarkRead(
  channelId: number,
  durationMs: number = DEFAULT_SUPPRESS_MS,
): void {
  suppressAutoMarkReadUntil.set(channelId, Date.now() + durationMs);
}

export function isAutoMarkReadSuppressed(channelId: number): boolean {
  const until = suppressAutoMarkReadUntil.get(channelId);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    suppressAutoMarkReadUntil.delete(channelId);
    return false;
  }
  return true;
}

export function clearAutoMarkReadSuppress(channelId: number): void {
  suppressAutoMarkReadUntil.delete(channelId);
}
