"use client";

import { useState, useEffect } from "react";
import { CounterpartyRisk } from "@/lib/goldrush";

interface Props {
  address: string;
  onAnalysisComplete?: (risk: CounterpartyRisk | null) => void;
}

export default function WalletAnalysis({ address }: Props) {
  const [risk, setRisk] = useState<CounterpartyRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) {
      setRisk(null);
      return;
    }
    let cancelled = false;
    const fetchRisk = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/analyze-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        if (!cancelled) setRisk(data);
      } catch {
        if (!cancelled) setError("Could not analyze wallet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRisk();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return null;
  if (loading)
    return <div className="text-sm text-gray-400">Analyzing wallet...</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!risk) return null;

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-between">
          <span
            className={`font-bold ${risk.level === "HIGH" ? "text-red-400" : risk.level === "MEDIUM" ? "text-yellow-400" : "text-green-400"}`}
          >
            {risk.level} RISK
          </span>
          <span className="text-2xl font-bold text-white">
            {risk.score}/100
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-300">{risk.summary}</p>
        {risk.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {risk.warnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-300/90">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-gray-800/30 rounded">
          <span className="text-gray-500">Type</span>
          <p className="text-white capitalize">
            {risk.walletType.replace("_", " ")}
          </p>
        </div>
        <div className="p-2 bg-gray-800/30 rounded">
          <span className="text-gray-500">Age</span>
          <p className="text-white">{risk.details.ageInDays}d</p>
        </div>
        <div className="p-2 bg-gray-800/30 rounded">
          <span className="text-gray-500">TXs</span>
          <p className="text-white">{risk.transactionCount}</p>
        </div>
        <div className="p-2 bg-gray-800/30 rounded">
          <span className="text-gray-500">30d Vol</span>
          <p className="text-white">${risk.thirtyDayVolume.toFixed(2)}</p>
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-400 hover:text-white">
          Detailed Details
        </summary>
        <p className="mt-1 text-gray-300">Avg TX Value: ${risk.details.avgTransactionValue.toFixed(2)}</p>
        <p className="mt-1 text-gray-300">Tokens Found: {risk.tokenCount}</p>
        <p className="mt-1 text-gray-300">Total USD Balance: ${risk.totalValueUSD.toFixed(2)}</p>
      </details>
    </div>
  );
}
