// app/ConfirmExpense.tsx
"use client";
import { useState } from "react";
import type { ExtractedData } from "@/lib/extractor";

interface Props {
  extracted: ExtractedData;
  onConfirm: (data: {
    merchant: string;
    amount: number;
    date: string;
    category: string;
  }) => void;
  onRetake: () => void;
}

const CATEGORIES = [
  "Food",
  "Travel",
  "Software",
  "Coworking",
  "Client Meeting",
  "Other",
];

export default function ConfirmExpense({
  extracted,
  onConfirm,
  onRetake,
}: Props) {
  const [merchant, setMerchant] = useState(extracted.merchant);
  const [amount, setAmount] = useState(extracted.amount?.toString() || "");
  const [date, setDate] = useState(extracted.date);
  const [category, setCategory] = useState("Other");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!merchant || isNaN(numAmount) || numAmount <= 0) return;
    onConfirm({ merchant, amount: numAmount, date, category });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 mt-4">
      {extracted.confidence !== "high" && (
        <div className="p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-yellow-300 text-sm">
          ⚠️ Low confidence detection. Please verify the fields.
        </div>
      )}

      <div>
        <label className="text-white/70 text-sm">Merchant</label>
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
          required
        />
      </div>
      <div>
        <label className="text-white/70 text-sm">Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
          required
        />
      </div>
      <div>
        <label className="text-white/70 text-sm">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
          required
        />
      </div>
      <div>
        <label className="text-white/70 text-sm">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white [&>option]:bg-black"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium"
        >
          ✅ Confirm
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="flex-1 py-3 bg-white/10 border border-white/30 rounded-xl font-medium"
        >
          🔄 Retake
        </button>
      </div>
    </form>
  );
}
