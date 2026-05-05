"use client";

import { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";

interface Props {
  imageBlobUrl: string | null;
  onTextExtracted: (text: string) => void;
  onError: (msg: string) => void;
}

export default function OcrProcessor({
  imageBlobUrl,
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

        const result = await Tesseract.recognize(sourceImage, "eng", {
          logger: (m) => {
            // Optional: you can show progress in UI later
            console.log(m);
          },
        });

        if (!cancelled && mountedRef.current) {
          onTextExtracted(result.data.text.trim());
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        if (!cancelled && mountedRef.current) {
          console.error("OCR Error:", err);
          onError("OCR failed. Try a clearer image.");

          setIsLoading(false);
        }
        isRunningRef.current = false;
      }
    }

    runOCR();

    return () => {
      cancelled = true;
    };
  }, [imageBlobUrl]);

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-3 text-white/70">
          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
          <span>Extracting text locally...</span>
        </div>
      )}
    </div>
  );
}
