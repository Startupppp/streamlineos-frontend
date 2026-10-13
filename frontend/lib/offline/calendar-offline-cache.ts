import type { CalendarEventsResponse } from "@/hooks/api/calendar-types";

export interface OfflineCalendarSnapshot {
  identity: string;
  fetchedAt: number;
  windowStart: string;
  windowEnd: string;
  coverage: "complete" | "partial" | "failed" | "continued";
  policyVersion: number;
  maxAgeDays: number;
  sources: { sourceKey: string; state: "complete" | "partial" | "failed" | "continued" }[];
  windows: { start: string; end: string; allDay: boolean; availability: "busy" | "free" | "out-of-office" | "working-elsewhere" }[];
}

const DB_NAME = "streamline-calendar-offline";
const STORE = "snapshot";
const KEY = "latest";
const SESSION_IDENTITY_KEY = "streamline-calendar-offline-session-identity";
const DEVICE_IDENTITY_KEY = "streamline-calendar-offline-identity";
const POLICY_REVOCATION_KEY = "streamline-calendar-offline-policy-revocation";
let cacheEpoch = 0;
let crossTabListenerReady = false;

function watchCrossTabIdentity(): void {
  if (crossTabListenerReady || typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (event.key !== DEVICE_IDENTITY_KEY && event.key !== POLICY_REVOCATION_KEY || event.oldValue === event.newValue) return;
    cacheEpoch++;
    try {
      const identity = sessionStorage.getItem(SESSION_IDENTITY_KEY);
      if (identity && (event.key === POLICY_REVOCATION_KEY || identity !== event.newValue)) sessionStorage.removeItem(SESSION_IDENTITY_KEY);
    } catch {}
  });
  crossTabListenerReady = true;
}

function identityIsCurrent(identity: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_IDENTITY_KEY) === identity &&
      localStorage.getItem(DEVICE_IDENTITY_KEY) === identity && !policyIsRevoked(identity);
  } catch {
    return false;
  }
}

function policyIsRevoked(identity: string, version?: number): boolean {
  try {
    const raw = localStorage.getItem(POLICY_REVOCATION_KEY);
    if (!raw) return false;
    const marker: unknown = JSON.parse(raw);
    if (!marker || typeof marker !== "object") return true;
    const revoked = marker as { identity?: unknown; version?: unknown };
    if (revoked.identity !== identity) return false;
    if (!Number.isInteger(revoked.version)) return true;
    return version === undefined || version <= (revoked.version as number);
  } catch {
    return true;
  }
}

export function allowOfflineCalendarPolicy(identity: string, version: number): boolean {
  if (!identity || !Number.isInteger(version) || version < 0) return false;
  if (policyIsRevoked(identity, version)) return false;
  try {
    const raw = localStorage.getItem(POLICY_REVOCATION_KEY);
    if (raw) {
      const marker = JSON.parse(raw) as { identity?: unknown };
      if (marker.identity === identity) localStorage.removeItem(POLICY_REVOCATION_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function revokeOfflineCalendarPolicy(identity: string, version: number): void {
  cacheEpoch++;
  try {
    localStorage.setItem(POLICY_REVOCATION_KEY, JSON.stringify({ identity, version }));
    localStorage.removeItem(DEVICE_IDENTITY_KEY);
    sessionStorage.removeItem(SESSION_IDENTITY_KEY);
  } catch {}
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void) => void): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    let result: T;
    let hasResult = false;
    transaction.oncomplete = () => {
      db.close();
      if (hasResult) resolve(result);
      else reject(new Error("Offline Calendar transaction completed without a result"));
    };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    action(transaction.objectStore(STORE), (value) => {
      result = value;
      hasResult = true;
    });
  }));
}

export async function saveOfflineCalendarSnapshot(
  identity: string,
  start: Date,
  end: Date,
  result: CalendarEventsResponse,
  policy: { version: number; maxAgeDays: number },
): Promise<void> {
  watchCrossTabIdentity();
  if (!identity || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
  const writeEpoch = cacheEpoch;
  const snapshot: OfflineCalendarSnapshot = {
    identity,
    fetchedAt: Date.now(),
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    coverage: result.coverageState,
    policyVersion: policy.version,
    maxAgeDays: policy.maxAgeDays,
    sources: result.coverage.map((entry) => ({ sourceKey: entry.sourceKey, state: entry.state })),
    windows: result.events.filter((event) => event.availability !== "free").slice(0, 2000).map((event) => ({
      start: event.start,
      end: event.end,
      allDay: Boolean(event.allDay),
      availability: event.availability,
    })),
  };
  await transact<void>("readwrite", (store, resolve) => {
    if (writeEpoch !== cacheEpoch || !identityIsCurrent(identity) || !allowOfflineCalendarPolicy(identity, policy.version)) return resolve();
    const request = store.put(snapshot, KEY);
    request.onsuccess = () => resolve();
  });
}

export async function readOfflineCalendarSnapshot(identity: string): Promise<OfflineCalendarSnapshot | null> {
  watchCrossTabIdentity();
  if (!identity || !identityIsCurrent(identity)) return null;
  const snapshot = await transact<OfflineCalendarSnapshot | null>("readonly", (store, resolve) => {
    const request = store.get(KEY);
    request.onsuccess = () => {
      const item: unknown = request.result;
      if (!item || typeof item !== "object" || (item as OfflineCalendarSnapshot).identity !== identity) return resolve(null);
      resolve(item as OfflineCalendarSnapshot);
    };
  });
  if (!snapshot || !identityIsCurrent(identity)) return null;
  const age = Date.now() - snapshot.fetchedAt;
  if (!Number.isFinite(age) || age < 0 ||
    !Number.isInteger(snapshot.policyVersion) || !Number.isInteger(snapshot.maxAgeDays) ||
    snapshot.maxAgeDays < 1 || snapshot.maxAgeDays > 30 ||
    age > snapshot.maxAgeDays * 86_400_000 ||
    !Array.isArray(snapshot.windows) || !Array.isArray(snapshot.sources)) {
    await clearOfflineCalendarSnapshot();
    return null;
  }
  return snapshot;
}

export async function clearOfflineCalendarSnapshot(): Promise<void> {
  cacheEpoch++;
  await transact<void>("readwrite", (store, resolve) => {
    const request = store.delete(KEY);
    request.onsuccess = () => resolve();
  });
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(DB_NAME);
    channel.postMessage({ type: "cleared" });
    channel.close();
  }
}

export function subscribeOfflineCalendarClear(onClear: () => void): () => void {
  watchCrossTabIdentity();
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(DB_NAME);
  if (channel) channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "cleared") onClear();
  };
  const onStorage = (event: StorageEvent) => {
    if ((event.key === DEVICE_IDENTITY_KEY || event.key === POLICY_REVOCATION_KEY) && event.oldValue !== event.newValue) onClear();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
