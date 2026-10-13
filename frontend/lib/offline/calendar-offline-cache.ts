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
  if (!identity || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
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
    const request = store.put(snapshot, KEY);
    request.onsuccess = () => resolve();
  });
}

export async function readOfflineCalendarSnapshot(identity: string): Promise<OfflineCalendarSnapshot | null> {
  if (!identity) return null;
  const snapshot = await transact<OfflineCalendarSnapshot | null>("readonly", (store, resolve) => {
    const request = store.get(KEY);
    request.onsuccess = () => {
      const item: unknown = request.result;
      if (!item || typeof item !== "object" || (item as OfflineCalendarSnapshot).identity !== identity) return resolve(null);
      resolve(item as OfflineCalendarSnapshot);
    };
  });
  if (!snapshot) return null;
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
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(DB_NAME);
  channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "cleared") onClear();
  };
  return () => channel.close();
}
