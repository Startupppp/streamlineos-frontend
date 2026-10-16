const OUTAGE_BASE_MS = 5_000;
const OUTAGE_CEILING_MS = 60_000;
let outageUntil = 0;
let outageBackoffMs = OUTAGE_BASE_MS;

export function noteOriginOutage(): void {
  if (Date.now() < outageUntil) return;
  outageUntil = Date.now() + outageBackoffMs;
  outageBackoffMs = Math.min(OUTAGE_CEILING_MS, outageBackoffMs * 2);
}

export function outageCircuitRemainingMs(): number {
  return Math.max(0, outageUntil - Date.now());
}

export function resetOutageCircuit(): void {
  outageUntil = 0;
  outageBackoffMs = OUTAGE_BASE_MS;
}
