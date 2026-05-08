"use client";

import { useState, useEffect, use } from "react";
import { getInvoice, type Invoice } from "@/lib/db";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function PayInvoicePage({ params }: Props) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvoice(id).then((data) => {
      setInvoice(data || null);
      setLoading(false);
    });
  }, [id]);

  async function handlePay() {
    if (!invoice) return;
    setPaying(true);
    setError(null);

    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalUsd,
          clientName: invoice.clientName,
          description: invoice.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

      // Redirect to Dodo Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setPaying(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">Loading invoice...</div>;
  if (!invoice) return <div className="min-h-screen bg-black text-white p-10 text-center">Invoice not found.</div>;

  return (
    <main className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="p-6 border border-white/20 rounded-3xl bg-white/5 space-y-4">
          <h1 className="text-xl font-bold">Pay Invoice</h1>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>Client</span>
              <span className="text-white">{invoice.clientName}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Amount</span>
              <span className="text-white text-lg font-bold">${invoice.totalUsd.toFixed(2)}</span>
            </div>
            {invoice.description && (
              <div className="text-sm text-white/60">
                <p className="mt-2 text-xs uppercase tracking-widest opacity-50">Description</p>
                <p className="text-white/80">{invoice.description}</p>
              </div>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg active:scale-95 transition disabled:opacity-50"
          >
            {paying ? "Redirecting..." : "💳 Pay with Dodo"}
          </button>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <p className="text-[10px] text-center text-white/30">
            Powered by Dodo Payments. Pay via Card or USDC on Solana.
          </p>
        </div>

        <Link href="/invoices" className="text-sm text-gray-500 hover:text-white">
          ← Cancel and go back
        </Link>
      </div>
    </main>
  );
}
