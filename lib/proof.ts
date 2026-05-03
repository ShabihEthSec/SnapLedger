import { sha256 } from "js-sha256";

export function normalizeExpense(data: {
  merchant: string;
  amount: number;
  date: string;
}) {
  const merchant = data.merchant.toLowerCase().trim();

  const amount = Number(data.amount).toFixed(2);

  const date = new Date(data.date).toISOString().split("T")[0];

  return `${merchant}|${amount}|${date}`;
}

export function generateExpenseProof(data: {
  merchant: string;
  amount: number;
  date: string;
}) {
  const normalized = normalizeExpense(data);

  const hash = hashNormalizedExpense(normalized);

  return {
    hash,
    normalized,
  };
}

export function hashNormalizedExpense(normalized: string) {
  return sha256(normalized);
}
