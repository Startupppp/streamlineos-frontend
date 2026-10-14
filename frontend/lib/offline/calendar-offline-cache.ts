import type { CalendarEventsResponse } from "@/hooks/api/calendar-types";

export interface OfflineCalendarSnapshot {
  identity: string;
  fetchedAt: number;
  windowStart: string;
  windowEnd: string;
  timeZone: string;
  coverage: "complete" | "partial" | "failed" | "continued";
  policyVersion: number;
  maxAgeDays: number;
  sources: {
    sourceKey: string;
    state: "complete" | "partial" | "failed" | "continued";
  }[];
  windows: {
    start: string;
    end: string;
    allDay: boolean;
    availability: "busy" | "free" | "out-of-office" | "working-elsewhere";
  }[];
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
    if (
      (event.key !== DEVICE_IDENTITY_KEY &&
        !event.key?.startsWith(`${POLICY_REVOCATION_KEY}:`)) ||
      event.oldValue === event.newValue
    )
      return;
    cacheEpoch++;
    try {
      const identity = sessionStorage.getItem(SESSION_IDENTITY_KEY);
      if (
        identity &&
        (event.key === policyKey(identity) ||
          (event.key === DEVICE_IDENTITY_KEY && identity !== event.newValue))
      )
        sessionStorage.removeItem(SESSION_IDENTITY_KEY);
    } catch {}
  });
  crossTabListenerReady = true;
}

function policyKey(identity: string): string {
  return `${POLICY_REVOCATION_KEY}:${identity}`;
}

function policyState(
  identity: string,
): { version: number; enabled: boolean } | null {
  const raw = localStorage.getItem(policyKey(identity));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("Invalid offline Calendar policy state");
  const state = value as { version?: unknown; enabled?: unknown };
  if (
    !Number.isInteger(state.version) ||
    (state.version as number) < 0 ||
    typeof state.enabled !== "boolean"
  )
    throw new Error("Invalid offline Calendar policy state");
  return state as { version: number; enabled: boolean };
}

export function offlineCalendarIdentityIsCurrent(identity: string): boolean {
  try {
    return (
      sessionStorage.getItem(SESSION_IDENTITY_KEY) === identity &&
      localStorage.getItem(DEVICE_IDENTITY_KEY) === identity &&
      !policyIsRevoked(identity)
    );
  } catch {
    return false;
  }
}

function policyIsRevoked(identity: string): boolean {
  try {
    const state = policyState(identity);
    return !state || !state.enabled;
  } catch {
    return true;
  }
}

function policyVersionIsCurrent(identity: string, version: number): boolean {
  try {
    const state = policyState(identity);
    return Boolean(state?.enabled && state.version === version);
  } catch {
    return false;
  }
}

export function allowOfflineCalendarPolicy(
  identity: string,
  version: number,
): boolean {
  if (!identity || !Number.isInteger(version) || version < 0) return false;
  try {
    const state = policyState(identity);
    if (
      state &&
      (version < state.version || (version === state.version && !state.enabled))
    )
      return false;
    if (!state || version > state.version)
      localStorage.setItem(
        policyKey(identity),
        JSON.stringify({ version, enabled: true }),
      );
    return true;
  } catch {
    return false;
  }
}

export function revokeOfflineCalendarPolicy(
  identity: string,
  version: number,
): void {
  if (!identity || !Number.isInteger(version) || version < 0) return;
  try {
    const state = policyState(identity);
    if (state && version < state.version) return;
    cacheEpoch++;
    localStorage.setItem(
      policyKey(identity),
      JSON.stringify({ version, enabled: false }),
    );
    if (localStorage.getItem(DEVICE_IDENTITY_KEY) === identity)
      localStorage.removeItem(DEVICE_IDENTITY_KEY);
    if (sessionStorage.getItem(SESSION_IDENTITY_KEY) === identity)
      sessionStorage.removeItem(SESSION_IDENTITY_KEY);
  } catch {}
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void) => void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        let result: T;
        let hasResult = false;
        transaction.oncomplete = () => {
          db.close();
          if (hasResult) resolve(result);
          else
            reject(
              new Error(
                "Offline Calendar transaction completed without a result",
              ),
            );
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
        action(transaction.objectStore(STORE), (value) => {
          result = value;
          hasResult = true;
        });
      }),
  );
}

export async function saveOfflineCalendarSnapshot(
  identity: string,
  start: Date,
  end: Date,
  result: CalendarEventsResponse,
  policy: { version: number; maxAgeDays: number },
  timeZone: string,
): Promise<void> {
  watchCrossTabIdentity();
  if (
    !identity ||
    !timeZone ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime())
  )
    return;
  const writeEpoch = cacheEpoch;
  const busyWindows = result.events.filter((event) => event.availability !== "free");
  const truncated = busyWindows.length > 2000;
  const snapshot: OfflineCalendarSnapshot = {
    identity,
    fetchedAt: Date.now(),
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    timeZone,
    coverage: truncated && result.coverageState === "complete" ? "partial" : result.coverageState,
    policyVersion: policy.version,
    maxAgeDays: policy.maxAgeDays,
    sources: result.coverage.map((entry) => ({
      sourceKey: entry.sourceKey,
      state: truncated && entry.state === "complete" ? "partial" : entry.state,
    })),
    windows: busyWindows
      .slice(0, 2000)
      .map((event) => ({
        start: event.start,
        end: event.end,
        allDay: Boolean(event.allDay),
        availability: event.availability,
      })),
  };
  await transact<void>("readwrite", (store, resolve) => {
    if (
      writeEpoch !== cacheEpoch ||
      !offlineCalendarIdentityIsCurrent(identity) ||
      !allowOfflineCalendarPolicy(identity, policy.version)
    )
      return resolve();
    const request = store.put(snapshot, KEY);
    request.onsuccess = () => resolve();
  });
}

export async function readOfflineCalendarSnapshot(
  identity: string,
): Promise<OfflineCalendarSnapshot | null> {
  watchCrossTabIdentity();
  if (!identity || !offlineCalendarIdentityIsCurrent(identity)) return null;
  const snapshot = await transact<OfflineCalendarSnapshot | null>(
    "readonly",
    (store, resolve) => {
      const request = store.get(KEY);
      request.onsuccess = () => {
        const item: unknown = request.result;
        if (
          !item ||
          typeof item !== "object" ||
          (item as OfflineCalendarSnapshot).identity !== identity
        )
          return resolve(null);
        resolve(item as OfflineCalendarSnapshot);
      };
    },
  );
  if (!snapshot || !offlineCalendarIdentityIsCurrent(identity)) return null;
  const age = Date.now() - snapshot.fetchedAt;
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    !Number.isInteger(snapshot.policyVersion) ||
    !policyVersionIsCurrent(identity, snapshot.policyVersion) ||
    !Number.isInteger(snapshot.maxAgeDays) ||
    snapshot.maxAgeDays < 1 ||
    snapshot.maxAgeDays > 30 ||
    age > snapshot.maxAgeDays * 86_400_000 ||
    typeof snapshot.timeZone !== "string" ||
    !snapshot.timeZone ||
    !Array.isArray(snapshot.windows) ||
    !Array.isArray(snapshot.sources)
  ) {
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

export function subscribeOfflineCalendarClear(onClear: () => void, identity?: string): () => void {
  watchCrossTabIdentity();
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(DB_NAME);
  if (channel)
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "cleared") onClear();
    };
  const onStorage = (event: StorageEvent) => {
    if (
      ((!identity && event.key?.startsWith(`${POLICY_REVOCATION_KEY}:`)) ||
        (identity && event.key === policyKey(identity)) ||
        (event.key === DEVICE_IDENTITY_KEY &&
          (!identity || event.oldValue === identity || event.newValue === identity))) &&
      event.oldValue !== event.newValue
    )
      onClear();
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    if (typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}
