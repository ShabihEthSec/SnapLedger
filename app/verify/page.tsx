"use client";

import { useState } from "react";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  type MessageCompiledInstruction,
  type TransactionResponse,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { hashNormalizedExpense } from "@/lib/proof";

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed",
);

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

type ImportableProof = {
  merchant?: string;
  amount?: number | string;
  date?: string;
  normalized?: string;
  hash?: string;
  tx?: string;
  txSignature?: string;
  proofString?: string;
  createdAt?: number;
};

function isImportableProof(value: unknown): value is ImportableProof {
  if (!value || typeof value !== "object") return false;

  const proof = value as Partial<ImportableProof>;

  return (
    typeof proof.hash === "string" &&
    ((typeof proof.normalized === "string" &&
      (typeof proof.tx === "string" ||
        typeof proof.txSignature === "string" ||
        proof.tx === undefined ||
        proof.txSignature === undefined)) ||
      (typeof proof.merchant === "string" &&
        (typeof proof.amount === "string" ||
          typeof proof.amount === "number") &&
        typeof proof.date === "string"))
  );
}

function toProofString(proof: ImportableProof) {
  if (typeof proof.proofString === "string") {
    return proof.proofString;
  }

  const tx = proof.tx ?? proof.txSignature ?? "";

  if (proof.normalized && proof.hash) {
    const hashProof = `${proof.normalized}|${proof.hash}`;
    return tx ? `${hashProof}|${tx}` : hashProof;
  }

  const amount =
    typeof proof.amount === "number" ? proof.amount.toFixed(2) : proof.amount;
  const hashProof = `${proof.merchant}|${amount}|${proof.date}|${proof.hash}`;

  return tx ? `${hashProof}|${tx}` : hashProof;
}

function isValidIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getMemoData(tx: TransactionResponse | VersionedTransactionResponse) {
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });
  const instructions: MessageCompiledInstruction[] = message.compiledInstructions;

  for (const instruction of instructions) {
    const programId = accountKeys.get(instruction.programIdIndex);
    if (programId?.equals(MEMO_PROGRAM_ID)) {
      return new TextDecoder().decode(instruction.data);
    }
  }

  return null;
}

export default function VerifyPage() {
  const importInputId = "verify-proof-import";
  const [proof, setProof] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("proof") ?? "";
  });
  const [result, setResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleImportProof(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const trimmedText = text.trim();

      if (!trimmedText) {
        setImportError("Imported file is empty");
        return;
      }

      try {
        const parsed = JSON.parse(trimmedText);
        const importedProof = Array.isArray(parsed)
          ? parsed
              .filter(isImportableProof)
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0]
          : isImportableProof(parsed)
            ? parsed
            : null;

        if (!importedProof) {
          setImportError("Invalid proof JSON");
          return;
        }

        setProof(toProofString(importedProof));
      } catch {
        setProof(trimmedText);
      }

      setResult(null);
      setImportError(null);
    } catch {
      setImportError("Failed to import proof");
    } finally {
      event.target.value = "";
    }
  }

  async function handleVerify() {
    try {
      const input = proof.trim();
      const parts = input.split("|");

      if (parts.length !== 4 && parts.length !== 5) {
        setResult("❌ Invalid proof format");
        return;
      }

      const [merchant, amount, date, hash, txSignature] = parts;
      const normalized = `${merchant}|${amount}|${date}`;

      if (
        merchant !== merchant.trim().toLowerCase().replace(/\s+/g, " ") ||
        !/^\d+\.\d{2}$/.test(amount) ||
        !isValidIsoDate(date)
      ) {
        setResult("❌ Invalid normalized proof fields");
        return;
      }

      // 🔁 Recompute hash
      const recomputedHash = hashNormalizedExpense(normalized);

      if (recomputedHash !== hash) {
        setResult("❌ INVALID — Data does not match original proof");
        return;
      }

      if (!txSignature) {
        setResult("⚠️ Hash is valid, but no transaction id was provided");
        return;
      }

      // ⛓️ Fetch transaction
      const tx = await connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        setResult("❌ Transaction not found");
        return;
      }

      const memoData = getMemoData(tx);

      if (!memoData) {
        setResult("❌ INVALID — Data does not match original proof");
      } else if (memoData === hash) {
        setResult("✅ VALID — Data matches and is anchored on Solana");
      } else {
        setResult("❌ INVALID — Data does not match original proof");
      }
    } catch (err) {
      console.error(err);
      setResult("❌ Verification failed");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-center">
          Verify Expense Proof
        </h1>

        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="Paste full proof string"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl"
        />

        <input
          id={importInputId}
          type="file"
          accept="application/json,.json,text/plain,.txt"
          onChange={handleImportProof}
          className="sr-only"
        />

        <label
          htmlFor={importInputId}
          className="w-full py-3 bg-white/10 border border-white/30 rounded-xl font-medium text-center"
        >
          Import Proof
        </label>

        <button
          onClick={handleVerify}
          className="w-full py-3 bg-blue-600 rounded-xl"
        >
          Verify
        </button>

        {importError && (
          <div className="p-3 border border-red-500/50 bg-red-500/20 rounded-xl text-red-300 text-sm">
            {importError}
          </div>
        )}

        {result && <div className="p-3 border rounded-xl text-sm">{result}</div>}
      </div>
    </main>
  );
}
