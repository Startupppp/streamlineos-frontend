import { clearOfflineCalendarSnapshot, saveOfflineCalendarSnapshot } from "./calendar-offline-cache";

function fakeIndexedDb() {
  const opens: Array<{ result: unknown; onsuccess?: () => void }> = [];
  const puts: unknown[] = [];
  const database = {
    close: jest.fn(),
    transaction: jest.fn(() => {
      let requested = false;
      const transaction: { oncomplete?: () => void; onerror?: () => void; onabort?: () => void; objectStore: () => unknown } = {
        objectStore: () => ({
          put: (value: unknown) => {
            requested = true;
            const request: { onsuccess?: () => void } = {};
            queueMicrotask(() => {
              puts.push(value);
              request.onsuccess?.();
              transaction.oncomplete?.();
            });
            return request;
          },
          delete: () => {
            requested = true;
            const request: { onsuccess?: () => void } = {};
            queueMicrotask(() => {
              request.onsuccess?.();
              transaction.oncomplete?.();
            });
            return request;
          },
        }),
      };
      queueMicrotask(() => { if (!requested) transaction.oncomplete?.(); });
      return transaction;
    }),
  };
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: { open: jest.fn(() => {
      const request: { result: unknown; onsuccess?: () => void } = { result: database };
      opens.push(request);
      return request;
    }) },
  });
  return {
    puts,
    openNext: () => {
      const request = opens.shift();
      if (!request) throw new Error("No pending IndexedDB open");
      request.onsuccess?.();
    },
  };
}

function save() {
  return saveOfflineCalendarSnapshot("org-1:user-1", new Date("2026-10-13T09:00:00.000Z"), new Date("2026-10-13T10:00:00.000Z"), {
    events: [], coverageState: "complete", coverage: [],
  } as never, { version: 1, maxAgeDays: 1 });
}

describe("Calendar offline cache identity", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("does not write an old response after the tab switches organizations", async () => {
    const db = fakeIndexedDb();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    const pending = save();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-2:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-2:user-1");
    db.openNext();
    await pending;
    expect(db.puts).toEqual([]);
  });

  it("does not write a queued response after the offline cache is cleared", async () => {
    const db = fakeIndexedDb();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    const pending = save();
    const clear = clearOfflineCalendarSnapshot();
    db.openNext();
    db.openNext();
    await Promise.all([pending, clear]);
    expect(db.puts).toEqual([]);
  });

  it("writes when the current tab and device identity still match", async () => {
    const db = fakeIndexedDb();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    const pending = save();
    db.openNext();
    await pending;
    expect(db.puts).toEqual([expect.objectContaining({ identity: "org-1:user-1" })]);
  });
});
