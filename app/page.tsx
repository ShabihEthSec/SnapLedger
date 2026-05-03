"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import OcrProcessor from "./OcrProcessor";
import ConfirmExpense from "./ConfirmExpense";
import { extractExpenseData } from "@/lib/extractor";
import { generateExpenseProof } from "@/lib/proof";
import { sendProofToSolana } from "@/lib/solana";
import { getAllProofs, saveProof, type StoredProof } from "@/lib/db";

type ConfirmedExpense = {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  normalized: string;
  hash: string;
  proofString: string;
  txSignature: string;
  createdAt: number;
  explorerUrl: string;
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [engine, setEngine] = useState<"tesseract" | "qvac">("tesseract");
  const [ocrText, setOcrText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState<ConfirmedExpense | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [storedProofs, setStoredProofs] = useState<StoredProof[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleEngineChange(nextEngine: "tesseract" | "qvac") {
    setEngine(nextEngine);
    setError(null);

    if (image) {
      setOcrText("");
      setConfirmed(null);
      setCopyStatus("idle");
    }
  }

  const handleOcrError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  async function refreshProofs() {
    const proofs = await getAllProofs();
    setStoredProofs(proofs.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    let cancelled = false;

    void getAllProofs().then((proofs) => {
      if (!cancelled) {
        setStoredProofs(proofs.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function getProofFileName(proof: ConfirmedExpense) {
    const merchant = proof.merchant
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const date = proof.date.trim().replace(/[^a-z0-9-]+/gi, "-");

    return `${merchant || "merchant"}-${date || "date"}.json`;
  }

  function handleExportProof(proof: ConfirmedExpense) {
    const exportProof = {
      merchant: proof.merchant,
      amount: proof.amount.toFixed(2),
      date: proof.date,
      hash: proof.hash,
      tx: proof.txSignature,
    };
    const blob = new Blob([JSON.stringify(exportProof, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getProofFileName(proof);
    link.click();

    URL.revokeObjectURL(url);
  }

  async function handleCopyProof(proofString: string) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(proofString);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = proofString;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  // 📸 Capture image
  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setOcrText("");
      setConfirmed(null);
      setCopyStatus("idle");

      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  // 🔄 Retake
  const handleRetake = () => {
    setImage(null);
    setOcrText("");
    setConfirmed(null);
    setCopyStatus("idle");
    setError(null);
    fileInputRef.current?.click();
  };

  // 🧠 Run extractor AFTER OCR
  const extracted = useMemo(() => {
    if (!ocrText) return null;

    // 🔍 ADD THIS BLOCK
    console.log("=== RAW OCR TEXT ===");
    console.log(JSON.stringify(ocrText));
    console.log("===================");

    const result = extractExpenseData(ocrText);
    console.log("Extracted:", result);

    return result;
  }, [ocrText]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-center">Snap a Receipt</h1>

        <a
          href="/verify"
          className="w-full py-3 bg-white/10 border border-white/30 rounded-xl font-medium text-center"
        >
          Go to Verify Page
        </a>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleCapture}
          className="hidden"
        />

        {!image ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-white text-black rounded-xl font-medium active:scale-95"
          >
            📷 Take Photo
          </button>
        ) : (
          <button
            onClick={handleRetake}
            className="w-full py-3 bg-white/10 border border-white/30 rounded-xl font-medium"
          >
            🔄 Retake Photo
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleEngineChange("tesseract")}
            className={`py-2 rounded-xl border font-medium ${
              engine === "tesseract"
                ? "bg-white text-black border-white"
                : "bg-white/10 border-white/30"
            }`}
          >
            Tesseract
          </button>
          <button
            type="button"
            onClick={() => handleEngineChange("qvac")}
            className={`py-2 rounded-xl border font-medium ${
              engine === "qvac"
                ? "bg-white text-black border-white"
                : "bg-white/10 border-white/30"
            }`}
          >
            QVAC
          </button>
        </div>

        {/* 📷 Image Preview */}
        {image && (
          <div className="rounded-2xl overflow-hidden border border-white/20">
            <img
              src={image}
              alt="Captured"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* 🤖 OCR */}
        {image && !ocrText && (
          <OcrProcessor
            imageBlobUrl={image}
            engine={engine}
            onTextExtracted={setOcrText}
            onError={handleOcrError}
          />
        )}

        {/* ❌ Error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 🧠 Extracted → Confirm UI */}
        {extracted && !confirmed && (
          <ConfirmExpense
            extracted={extracted}
            onConfirm={async (data) => {
              try {
                const proof = generateExpenseProof(data);

                if (!proof.ok) {
                  setError(proof.error.message);
                  return;
                }

                // ⛓️ Send to Solana
                const solanaResult = await sendProofToSolana(proof.hash);
                const anchoredProof = generateExpenseProof(
                  {
                    merchant: proof.normalized.merchant,
                    amount: proof.normalized.amount,
                    date: proof.normalized.date,
                  },
                  solanaResult.signature,
                );

                if (!anchoredProof.ok) {
                  setError(anchoredProof.error.message);
                  return;
                }

                const finalProof = {
                  merchant: proof.normalized.merchant,
                  amount: Number(proof.normalized.amount),
                  date: proof.normalized.date,
                  normalized: proof.baseString,
                  hash: proof.hash,
                  txSignature: solanaResult.signature,
                  createdAt: Date.now(),
                };

                const final = {
                  merchant: proof.normalized.merchant,
                  amount: Number(proof.normalized.amount),
                  date: proof.normalized.date,
                  category: data.category,
                  normalized: finalProof.normalized,
                  hash: proof.hash,
                  proofString: anchoredProof.proofString,
                  txSignature: solanaResult.signature,
                  createdAt: finalProof.createdAt,
                  explorerUrl: solanaResult.explorerUrl,
                };

                await saveProof(finalProof);
                await refreshProofs();

                console.log("Final Proof:", final);

                setConfirmed(final);
                setCopyStatus("idle");
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to anchor expense proof",
                );
              }
            }}
            onRetake={handleRetake}
          />
        )}

        {/* ✅ Final State */}
        {confirmed && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 space-y-3">
            <h2 className="font-semibold">✅ Expense Proof Anchored</h2>

            <div className="text-xs break-all">
              <strong>Hash:</strong>
              <div>{confirmed.hash}</div>
            </div>

            <div className="text-xs break-all">
              <strong>Tx Signature:</strong>
              <div>{confirmed.txSignature}</div>
            </div>

            <div className="text-xs break-all">
              <strong>Proof String:</strong>
              <div>{confirmed.proofString}</div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyProof(confirmed.proofString)}
              className="w-full py-3 bg-white/10 border border-white/30 rounded-xl font-medium text-white"
            >
              {copyStatus === "copied" ? "Copied" : "Copy Proof"}
            </button>

            {copyStatus === "failed" && (
              <div className="text-xs text-red-300">
                Failed to copy proof. Select and copy it manually.
              </div>
            )}

            <a
              href={confirmed.explorerUrl}
              target="_blank"
              className="text-blue-400 underline text-sm"
            >
              View on Solana Explorer
            </a>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-3">
            {confirmed && (
              <button
                type="button"
                onClick={() => handleExportProof(confirmed)}
                className="flex-1 py-3 bg-white/10 border border-white/30 rounded-xl font-medium"
              >
                Export Proof
              </button>
            )}
          </div>

          {storedProofs.length > 0 && (
            <div className="space-y-2">
              {storedProofs.map((proof) => (
                <div
                  key={proof.hash}
                  className="p-3 border border-white/20 rounded-xl text-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="truncate">{proof.merchant}</div>
                    <div className="text-white/60">
                      {proof.amount.toFixed(2)} | {proof.date}
                    </div>
                  </div>
                  <a
                    href={`/verify?proof=${encodeURIComponent(
                      `${proof.normalized}|${proof.hash}|${proof.txSignature}`,
                    )}`}
                    className="shrink-0 text-blue-400 underline"
                  >
                    Verify
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
