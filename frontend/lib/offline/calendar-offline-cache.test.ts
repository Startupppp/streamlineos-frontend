import { allowOfflineCalendarPolicy, clearOfflineCalendarSnapshot, readOfflineCalendarSnapshot, revokeOfflineCalendarPolicy, saveOfflineCalendarSnapshot, subscribeOfflineCalendarClear } from "./calendar-offline-cache";

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
  allowOfflineCalendarPolicy("org-1:user-1", 1);
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

  it("invalidates a queued write when another tab removes the device identity", async () => {
    const db = fakeIndexedDb();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    const pending = save();
    localStorage.removeItem("streamline-calendar-offline-identity");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "streamline-calendar-offline-identity",
      oldValue: "org-1:user-1",
      newValue: null,
    }));
    db.openNext();
    await pending;
    expect(sessionStorage.getItem("streamline-calendar-offline-session-identity")).toBeNull();
    expect(db.puts).toEqual([]);
  });

  it("notifies an open panel as soon as another tab changes identity", () => {
    const onClear = jest.fn();
    const unsubscribe = subscribeOfflineCalendarClear(onClear);
    window.dispatchEvent(new StorageEvent("storage", {
      key: "streamline-calendar-offline-identity",
      oldValue: "org-1:user-1",
      newValue: null,
    }));
    expect(onClear).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("removes the current tab marker after a matching policy revocation event", () => {
    const onClear = jest.fn();
    const unsubscribe = subscribeOfflineCalendarClear(onClear);
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "streamline-calendar-offline-policy-revocation:org-2:user-1",
      oldValue: null,
      newValue: '{"version":2,"enabled":false}',
    }));
    expect(sessionStorage.getItem("streamline-calendar-offline-session-identity")).toBe("org-1:user-1");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "streamline-calendar-offline-policy-revocation:org-1:user-1",
      oldValue: null,
      newValue: '{"version":2,"enabled":false}',
    }));
    expect(sessionStorage.getItem("streamline-calendar-offline-session-identity")).toBeNull();
    expect(onClear).toHaveBeenCalledTimes(2);
    unsubscribe();
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

  it("rejects a stale enabled policy after another tab disables caching", async () => {
    const db = fakeIndexedDb();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    const pending = save();
    revokeOfflineCalendarPolicy("org-1:user-1", 2);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 1)).toBe(false);
    db.openNext();
    await pending;
    expect(db.puts).toEqual([]);
    expect(await readOfflineCalendarSnapshot("org-1:user-1")).toBeNull();
    sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
    localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
    expect(await readOfflineCalendarSnapshot("org-1:user-1")).toBeNull();
  });

  it("allows caching again only after a newer enabled policy arrives", async () => {
    revokeOfflineCalendarPolicy("org-1:user-1", 2);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 2)).toBe(false);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 3)).toBe(true);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 1)).toBe(false);
    revokeOfflineCalendarPolicy("org-1:user-1", 1);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 3)).toBe(true);
  });

  it("keeps each account policy state independent", () => {
    revokeOfflineCalendarPolicy("org-1:user-1", 4);
    revokeOfflineCalendarPolicy("org-2:user-1", 2);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 3)).toBe(false);
    expect(allowOfflineCalendarPolicy("org-2:user-1", 3)).toBe(true);
    expect(allowOfflineCalendarPolicy("org-1:user-1", 3)).toBe(false);
  });
});
