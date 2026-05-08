"use client";

import { useState, useEffect } from "react";
import { getAllInvoices, saveInvoice, type Invoice } from "@/lib/db";
import Link from "next/link";
import { resolveSnsName } from "@/lib/sns";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [snsName, setSnsName] = useState<string | null>(null);

  useEffect(() => {
    refreshInvoices();
    // Resolve SNS for the current wallet if connected
    const { solana } = window as any;
    if (solana?.publicKey) {
      resolveSnsName(solana.publicKey.toString()).then(setSnsName);
    }
  }, []);

  async function refreshInvoices() {
    const data = await getAllInvoices();
    setInvoices(data.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      clientName,
      description,
      totalUsd: parseFloat(amount),
      currency: "USD",
      status: "PENDING",
      createdAt: Date.now(),
    };
    await saveInvoice(newInvoice);
    setClientName("");
    setAmount("");
    setDescription("");
    setShowCreate(false);
    refreshInvoices();
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>

        {snsName && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
            👤 Identity: <strong>{snsName}</strong>
          </div>
        )}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full py-3 bg-white text-black rounded-xl font-medium active:scale-95 transition"
        >
          {showCreate ? "Close" : "➕ Create New Invoice"}
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="p-4 border border-white/20 rounded-2xl bg-white/5 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Client Name</label>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-white/40"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Amount (USD)</label>
              <input
                required
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-white/40"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-white/40"
                placeholder="Service details..."
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              Save Invoice
            </button>
          </form>
        )}

        <div className="space-y-3">
          {invoices.length === 0 && !showCreate && (
            <p className="text-center text-white/40 py-10">No invoices yet.</p>
          )}
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 border border-white/20 rounded-2xl bg-white/5 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{inv.clientName}</div>
                <div className="text-sm text-white/60">
                  ${inv.totalUsd.toFixed(2)} | {inv.status}
                </div>
              </div>
              <div className="flex gap-2">
                {inv.status === "PENDING" ? (
                  <Link
                    href={`/invoices/${inv.id}/pay`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
                  >
                    Pay
                  </Link>
                ) : (
                  <Link
                    href={`/proof/${inv.id}`}
                    className="px-4 py-2 bg-green-600/20 border border-green-600/40 text-green-400 rounded-xl text-sm"
                  >
                    View Proof
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
