export type StoredProof = {
  merchant: string;
  amount: number;
  date: string;
  normalized: string;
  hash: string;
  txSignature: string;
  createdAt: number;
};

export type Invoice = {
  id: string;
  clientName: string;
  description?: string;
  totalUsd: number;
  currency: string;
  status: "PENDING" | "PAID";
  dodoSessionId?: string;
  createdAt: number;
};

export type Payment = {
  id: string;
  invoiceId: string;
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: number;
};

const DB_NAME = "snapledger";
const DB_VERSION = 2;
const STORE_PROOFS = "proofs";
const STORE_INVOICES = "invoices";
const STORE_PAYMENTS = "payments";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROOFS)) {
        db.createObjectStore(STORE_PROOFS, { keyPath: "hash" });
      }
      if (!db.objectStoreNames.contains(STORE_INVOICES)) {
        db.createObjectStore(STORE_INVOICES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PAYMENTS)) {
        db.createObjectStore(STORE_PAYMENTS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function runStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
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

// Proofs
export async function saveProof(proof: StoredProof) {
  await runStore("readwrite", STORE_PROOFS, (store) => store.put(proof));
}

export async function getAllProofs() {
  return runStore<StoredProof[]>(STORE_PROOFS, "readonly", (store) => store.getAll());
}

// Invoices
export async function saveInvoice(invoice: Invoice) {
  await runStore(STORE_INVOICES, "readwrite", (store) => store.put(invoice));
}

export async function getAllInvoices() {
  return runStore<Invoice[]>(STORE_INVOICES, "readonly", (store) => store.getAll());
}

export async function getInvoice(id: string) {
  return runStore<Invoice>(STORE_INVOICES, "readonly", (store) => store.get(id));
}

// Payments
export async function savePayment(payment: Payment) {
  await runStore(STORE_PAYMENTS, "readwrite", (store) => store.put(payment));
}

export async function getAllPayments() {
  return runStore<Payment[]>(STORE_PAYMENTS, "readonly", (store) => store.getAll());
}
