import type { CalendarEventsResponse } from "@/hooks/api/calendar-types";

export interface OfflineCalendarSnapshot {
  identity: string;
  fetchedAt: number;
  windowStart: string;
  windowEnd: string;
  coverage: "complete" | "partial" | "failed" | "continued";
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
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    action(transaction.objectStore(STORE), resolve);
  }));
}

export async function saveOfflineCalendarSnapshot(
  identity: string,
  start: Date,
  end: Date,
  result: CalendarEventsResponse,
): Promise<void> {
  if (!identity || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
  const snapshot: OfflineCalendarSnapshot = {
    identity,
    fetchedAt: Date.now(),
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    coverage: result.coverageState,
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
  return transact<OfflineCalendarSnapshot | null>("readonly", (store, resolve) => {
    const request = store.get(KEY);
    request.onsuccess = () => {
      const item: unknown = request.result;
      if (!item || typeof item !== "object" || (item as OfflineCalendarSnapshot).identity !== identity) return resolve(null);
      const snapshot = item as OfflineCalendarSnapshot;
      if (!Number.isFinite(snapshot.fetchedAt) || snapshot.fetchedAt > Date.now() ||
        !Array.isArray(snapshot.windows) || !Array.isArray(snapshot.sources)) return resolve(null);
      resolve(snapshot);
    };
  });
}

export async function clearOfflineCalendarSnapshot(): Promise<void> {
  await transact<void>("readwrite", (store, resolve) => {
    const request = store.delete(KEY);
    request.onsuccess = () => resolve();
  });
}
