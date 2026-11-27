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

export async function readVttMap(roomOrigin: string, editorSession: string): Promise<unknown> {
  const current = await cacheTransaction(mapStore, 'readonly', store => store.get([roomOrigin, 'tab', editorSession]));
  const entry = current ?? await cacheTransaction(mapStore, 'readonly', store => store.get(roomOrigin));
  if (typeof entry !== 'string') return entry; // Older browsers stored the map at the origin key.
  return cacheTransaction(mapStore, 'readonly', store => store.get([roomOrigin, 'room', entry]));
}

export function writeVttMap(roomOrigin: string, editorSession: string, save: unknown, masterKey: string): Promise<IDBValidKey> {
  return cacheTransaction(mapStore, 'readwrite', store => {
    const record = {save, masterKey};
    store.put(masterKey, roomOrigin);
    store.put(masterKey, [roomOrigin, 'tab', editorSession]);
    return store.put(record, [roomOrigin, 'room', masterKey]);
  });
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
