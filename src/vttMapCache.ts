const databaseName = 'hexcrawl-vtt';
const mapStore = 'master-maps';

function openMapCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(mapStore);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function mapCacheTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openMapCache();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(mapStore, mode);
      const request = operation(transaction.objectStore(mapStore));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('VTT map cache transaction aborted'));
    });
  } finally {
    database.close();
  }
}

export function readVttMap(roomOrigin: string): Promise<unknown> {
  return mapCacheTransaction('readonly', store => store.get(roomOrigin));
}

export function writeVttMap(roomOrigin: string, save: unknown): Promise<IDBValidKey> {
  return mapCacheTransaction('readwrite', store => store.put(save, roomOrigin));
}
