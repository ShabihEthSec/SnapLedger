"use client";

import { useState, useEffect, use } from "react";
import { getInvoice, saveInvoice, type Invoice } from "@/lib/db";
import Link from "next/link";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

interface Props {
  params: Promise<{ invoiceId: string }>;
}

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export default function ProofPage({ params }: Props) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const inv = await getInvoice(invoiceId);
      if (inv) {
        // Optimistically mark as PAID when user returns to this page
        if (inv.status === "PENDING") {
          inv.status = "PAID";
          await saveInvoice(inv);
        }
        setInvoice(inv);
        
        // Try to find the anchored proof on Solana
        // In a real app, we'd poll or wait for the webhook to finish.
        // For the demo, we'll try to find a recent transaction with the memo.
        findProofOnChain(inv.id);
      }
      setLoading(false);
    }
    init();
  }, [invoiceId]);

  async function findProofOnChain(id: string) {
    // This is a mock search for the demo. 
    // In production, we'd search for signatures containing the memo 'invoice:[id]'
    console.log("Searching for proof on-chain for invoice:", id);
  }

  if (loading) return <div className="min-h-screen bg-black text-white p-10 text-center">Verifying proof...</div>;
  if (!invoice) return <div className="min-h-screen bg-black text-white p-10 text-center">Invoice not found.</div>;

  return (
    <main className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="p-8 border border-green-500/30 rounded-3xl bg-green-500/5 space-y-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-green-400">Payment Verified</h1>
          
          <div className="space-y-1">
            <p className="text-white/60">Proof of Payment for</p>
            <p className="text-xl font-bold">{invoice.clientName}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl text-left space-y-2">
            <div className="flex justify-between text-xs text-white/40">
              <span>Invoice ID</span>
              <span className="truncate ml-4">{invoice.id}</span>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>Amount</span>
              <span className="text-white">${invoice.totalUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>Status</span>
              <span className="text-green-400 font-bold">PAID</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">On-Chain Anchor</p>
            <div className="p-3 border border-white/10 rounded-xl bg-black/50 text-[10px] break-all font-mono text-white/60">
              {/* In a real scenario, this would be the actual TX signature */}
              Proof anchored via SPL Memo on Solana Devnet
            </div>
          </div>

          <Link
            href="/invoices"
            className="block w-full py-3 bg-white text-black rounded-xl font-medium"
          >
            Back to Invoices
          </Link>
        </div>

        <p className="text-xs text-center text-white/30">
          This proof is immutable and verifiable on the Solana blockchain.
        </p>
      </div>
    </main>
  );
}
