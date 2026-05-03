export type StoredProof = {
  merchant: string;
  amount: number;
  date: string;
  normalized: string;
  hash: string;
  txSignature: string;
  createdAt: number;
};

const DB_NAME = "snapledger";
const DB_VERSION = 1;
const STORE_NAME = "proofs";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "hash" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function isValidProof(value: unknown): value is StoredProof {
  if (!value || typeof value !== "object") return false;

  const proof = value as Partial<StoredProof>;

  return (
    typeof proof.merchant === "string" &&
    typeof proof.amount === "number" &&
    typeof proof.date === "string" &&
    typeof proof.normalized === "string" &&
    typeof proof.hash === "string" &&
    typeof proof.txSignature === "string" &&
    typeof proof.createdAt === "number"
  );
}

function runStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed"));
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB transaction failed"));
        };
      }),
  );
}

export async function saveProof(proof: StoredProof) {
  if (!isValidProof(proof)) return;
  await runStore("readwrite", (store) => store.put(proof));
}

export async function getAllProofs() {
  return runStore<StoredProof[]>("readonly", (store) => store.getAll());
}

export async function clearProofs() {
  await runStore("readwrite", (store) => store.clear());
}

export async function bulkInsertProofs(proofs: unknown[]) {
  const validProofs = proofs.filter(isValidProof);
  if (validProofs.length === 0) return;

  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const proof of validProofs) {
      store.put(proof);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to import proofs"));
    };
  });
}
