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
  const [proof, setProof] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("proof") ?? "";
  });
  const [result, setResult] = useState<string | null>(null);

  async function handleVerify() {
    try {
      const input = proof.trim();
      const parts = input.split("|");

      if (parts.length === 1) {
        setResult("❌ Invalid proof format");
        return;
      }

      if (parts.length === 2) {
        const [hash, txSignature] = parts;

        const tx = await connection.getTransaction(txSignature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
          setResult("❌ Transaction not found");
          return;
        }

        const memoData = getMemoData(tx);

        if (memoData === hash) {
          setResult("⚠️ Hash found on-chain, but no input data provided");
        } else {
          setResult("❌ INVALID — Data does not match original proof");
        }

        return;
      }

      const [hash, txSignature] = parts.slice(-2);
      const normalized = parts.slice(0, -2).join("|");

      // 🔁 Recompute hash
      const recomputedHash = hashNormalizedExpense(normalized);

      if (recomputedHash !== hash) {
        setResult("❌ INVALID — Data does not match original proof");
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

        <button
          onClick={handleVerify}
          className="w-full py-3 bg-blue-600 rounded-xl"
        >
          Verify
        </button>

        {result && <div className="p-3 border rounded-xl text-sm">{result}</div>}
      </div>
    </main>
  );
}
