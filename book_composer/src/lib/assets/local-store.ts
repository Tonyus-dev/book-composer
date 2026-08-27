const DB_NAME = "kallistis-book-assets";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponível"));
  });
}

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const operation = run(transaction.objectStore(STORE_NAME));
        operation.onsuccess = () => resolve(operation.result);
        operation.onerror = () => reject(operation.error ?? new Error("Falha no asset store"));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("Falha no asset store"));
      }),
  );
}

export const localAssetKey = (projectId: string, assetId: string) => `${projectId}/${assetId}`;

export async function putAssetBlob(key: string, blob: Blob): Promise<void> {
  await request("readwrite", (store) => store.put(blob, key));
  if (!(await hasAssetBlob(key))) throw new Error("Asset não foi confirmado no IndexedDB");
}

export async function getAssetBlob(key: string): Promise<Blob | null> {
  return (await request("readonly", (store) => store.get(key))) ?? null;
}

export async function hasAssetBlob(key: string): Promise<boolean> {
  return (await request("readonly", (store) => store.count(key))) > 0;
}

export async function deleteAssetBlob(key: string): Promise<void> {
  await request("readwrite", (store) => store.delete(key));
}

export function dataUrlToBlob(data: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(data);
  if (!match) throw new Error("Data URL inválido");
  const raw = match[2] ? atob(match[3]!) : decodeURIComponent(match[3]!);
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] || "application/octet-stream" });
}
