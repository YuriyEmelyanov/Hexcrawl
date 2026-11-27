const databaseName = 'hexcrawl-vtt';
const mapStore = 'master-maps';
const roomStore = 'confirmed-rooms';

function openMapCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onupgradeneeded = event => {
      if (event.oldVersion === 0) request.result.createObjectStore(mapStore);
      request.result.createObjectStore(roomStore);
    };
    request.onblocked = () => reject(new Error('VTT storage upgrade blocked'));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function cacheTransaction<T>(name: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openMapCache();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(name, mode);
      const request = operation(transaction.objectStore(name));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('VTT map cache transaction aborted'));
    });
  } finally {
    database.close();
  }
}

const tabRoomKey = (roomOrigin: string) => `hexcrawl-vtt-editor-room:${roomOrigin}`;

export function rememberVttMap(roomOrigin: string, masterKey: string): void {
  // A new tab may inherit the initial session storage. Later writes are
  // local to that tab, unlike a shared IndexedDB tab-id entry.
  try {
    sessionStorage.setItem(tabRoomKey(roomOrigin), masterKey);
  } catch {
    // The latest saved map remains available when tab storage is disabled.
  }
}

export async function readVttMap(roomOrigin: string): Promise<unknown> {
  let remembered: string | null = null;
  let legacySession: string | null = null;
  try {
    remembered = sessionStorage.getItem(tabRoomKey(roomOrigin));
    if (!remembered) legacySession = sessionStorage.getItem('hexcrawl-vtt-editor-session');
  } catch {
    // Fall back to the durable latest entry.
  }
  if (remembered) return cacheTransaction(mapStore, 'readonly', store => store.get([roomOrigin, 'room', remembered]));
  const current = legacySession
    ? await cacheTransaction(mapStore, 'readonly', store => store.get([roomOrigin, 'tab', legacySession]))
    : undefined;
  const entry = current ?? await cacheTransaction(mapStore, 'readonly', store => store.get(roomOrigin));
  if (typeof entry !== 'string') return entry; // Older browsers stored the map at the origin key.
  return cacheTransaction(mapStore, 'readonly', store => store.get([roomOrigin, 'room', entry]));
}

export async function writeVttMap(roomOrigin: string, save: unknown, masterKey: string): Promise<void> {
  await cacheTransaction(mapStore, 'readwrite', store => {
    const record = {save, masterKey};
    store.put(masterKey, roomOrigin);
    return store.put(record, [roomOrigin, 'room', masterKey]);
  });
  rememberVttMap(roomOrigin, masterKey);
}

export function readVttRoom(cacheKey: string): Promise<unknown> {
  return cacheTransaction(roomStore, 'readonly', store => store.get(cacheKey));
}

export function writeVttRoom(cacheKey: string, snapshot: {revision: number}): Promise<unknown> {
  return cacheTransaction(roomStore, 'readwrite', store => {
    const current = store.get(cacheKey);
    current.onsuccess = () => {
      if (!current.result || current.result.revision <= snapshot.revision) store.put(snapshot, cacheKey);
    };
    return current;
  });
}
