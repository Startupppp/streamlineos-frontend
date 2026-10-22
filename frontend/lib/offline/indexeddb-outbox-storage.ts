import {
  DuplicateOutboxKeyError,
  createMemoryOutboxStorage,
  type OutboxStorage,
} from "./outbox-storage";

const DATABASE_NAME = "streamlineos-inventory-outbox";
const DATABASE_VERSION = 1;
const STORE_NAME = "operations";

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("The offline queue could not be read."));
    };
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error("The offline queue write was rolled back."));
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("The offline queue write failed."));
    };
  });
}

export function isIndexedDbAvailable(): boolean {
  return typeof globalThis.indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "clientOperationId" });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(
        request.error ?? new Error("The offline queue database could not be opened."),
      );
    };
    request.onblocked = () => {
      reject(
        new Error(
          "Another tab is holding an older version of the offline queue. Close it and reload.",
        ),
      );
    };
  });
}

export function createIndexedDbOutboxStorage(): OutboxStorage {
  let handle: Promise<IDBDatabase> | null = null;
  const database = (): Promise<IDBDatabase> => (handle ??= openDatabase());

  const withStore = async <T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> => {
    const db = await database();
    const tx = db.transaction(STORE_NAME, mode);
    const result = await work(tx.objectStore(STORE_NAME));
    if (mode === "readwrite") await transactionDone(tx);
    return result;
  };

  return {
    all: () =>
      withStore("readonly", (store) =>
        promisify(store.getAll()),
      ),

    insert: (entry) =>
      withStore("readwrite", async (store) => {
        try {
          await promisify(store.add(entry));
        } catch (error) {
          if (error instanceof DOMException && error.name === "ConstraintError") {
            throw new DuplicateOutboxKeyError(entry.clientOperationId);
          }
          throw error;
        }
      }),

    save: (entries) =>
      withStore("readwrite", async (store) => {
        for (const entry of entries) await promisify(store.put(entry));
      }),

    remove: (ids) =>
      withStore("readwrite", async (store) => {
        for (const id of ids) await promisify(store.delete(id));
      }),
  };
}

export function createOutboxStorage(): OutboxStorage {
  return isIndexedDbAvailable()
    ? createIndexedDbOutboxStorage()
    : createMemoryOutboxStorage();
}
