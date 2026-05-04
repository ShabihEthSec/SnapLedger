"use client";

import { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";

type OcrEngine = "tesseract" | "qvac";

interface Props {
  imageBlobUrl: string | null;
  engine: OcrEngine;
  onTextExtracted: (text: string) => void;
  onError: (msg: string) => void;
}

export default function OcrProcessor({
  imageBlobUrl,
  engine,
  onTextExtracted,
  onError,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  // ✅ hooks MUST be inside component
  const mountedRef = useRef(true);
  const isRunningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (abortRef.current) {
        abortRef.current.abort(); // cleanup
      }
    };
  }, []);

  useEffect(() => {
    if (!imageBlobUrl) return;

    let cancelled = false;
    const sourceImage = imageBlobUrl;

    async function runOCR() {
      if (isRunningRef.current) return;

      isRunningRef.current = true;

      try {
        setIsLoading(true);

        if (engine === "qvac") {
          if (abortRef.current) {
            abortRef.current.abort();
          }

          const controller = new AbortController();
          abortRef.current = controller;

          const formData = new FormData();
          const blob = await fetch(sourceImage).then((r) => r.blob());
          formData.append("image", blob);

          const res = await fetch("/api/ocr-qvac", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error("QVAC OCR failed");
          }

          const data = (await res.json()) as { text?: string };

          if (!cancelled && mountedRef.current) {
            onTextExtracted((data.text ?? "").trim());
          }

          return;
        }

        const result = await Tesseract.recognize(sourceImage, "eng");

        if (!cancelled && mountedRef.current) {
          onTextExtracted(result.data.text.trim());
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        if (!cancelled && mountedRef.current) {
          console.error("OCR Error:", err);
          onError(
            engine === "qvac"
              ? "QVAC OCR failed. Try Tesseract or a clearer image."
              : "OCR failed. Try a clearer image.",
          );
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        isRunningRef.current = false;
      }
    }

    runOCR();

    return () => {
      cancelled = true;
    };
  }, [imageBlobUrl, engine, onTextExtracted, onError]);

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-3 text-white/70">
          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
          <span>
            {engine === "qvac"
              ? "Extracting text with QVAC..."
              : "Extracting text locally..."}
          </span>
        </div>
      )}
    </div>
  );
}
