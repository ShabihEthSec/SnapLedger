"use client";

import { useState, useRef, useEffect } from "react";
import OcrProcessor from "./OcrProcessor";
import ConfirmExpense from "./ConfirmExpense";
import { extractExpenseData, type ExtractedData } from "@/lib/extractor";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [confirmed, setConfirmed] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📸 Capture image
  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setOcrText("");
      setExtracted(null);
      setConfirmed(null);

      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  // 🔄 Retake
  const handleRetake = () => {
    setImage(null);
    setOcrText("");
    setExtracted(null);
    setConfirmed(null);
    setError(null);
    fileInputRef.current?.click();
  };

  // 🧠 Run extractor AFTER OCR
  useEffect(() => {
    if (!ocrText) return;

    // 🔍 ADD THIS BLOCK
    console.log("=== RAW OCR TEXT ===");
    console.log(JSON.stringify(ocrText));
    console.log("===================");

    const result = extractExpenseData(ocrText);
    console.log("Extracted:", result);

    setExtracted(result);
  }, [ocrText]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-center">Snap a Receipt</h1>

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
            onTextExtracted={setOcrText}
            onError={(msg) => setError(msg)}
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
            onConfirm={(data) => {
              console.log("Confirmed:", data);
              setConfirmed(data);
            }}
            onRetake={handleRetake}
          />
        )}

        {/* ✅ Final State */}
        {confirmed && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300">
            <h2 className="font-semibold mb-2">✅ Expense Saved</h2>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(confirmed, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
