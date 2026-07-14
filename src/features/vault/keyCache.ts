// IndexedDB cache for the unlocked master key. CryptoKey objects are
// structured-cloneable, and ours is non-extractable — the raw bytes can't be
// read back out even with devtools access to IDB.

const DB = "flowlet-vault";
const STORE = "keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function getCachedKey(uid: string): Promise<CryptoKey | null> {
  try {
    return ((await tx("readonly", (s) => s.get(`mk-${uid}`))) as CryptoKey) ?? null;
  } catch {
    return null;
  }
}

export async function cacheKey(uid: string, key: CryptoKey): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(key, `mk-${uid}`));
  } catch {
    // Cache is an optimization; unlock still works without it.
  }
}

export async function clearCachedKey(uid: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(`mk-${uid}`));
  } catch {
    // ignore
  }
}
