"use client";

import { useEffect, useState } from "react";
import { useSolflare } from "@/hooks/useSolflare";

export default function OpenInSolflare() {
  const { isSolflareBrowser } = useSolflare();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isSolflareBrowser) {
    return null;
  }

  const dAppUrl = window.location.origin + "/capture";

  const browseUrl = `https://solflare.com/ul/v1/browse/${encodeURIComponent(
    dAppUrl,
  )}?ref=${encodeURIComponent("https://snapledger.vercel.app")}`;

  return (
    <a
      href={browseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium"
    >
      <span>📱</span>
      Open in Solflare
    </a>
  );
}
