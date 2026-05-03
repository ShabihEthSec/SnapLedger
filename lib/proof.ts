import { sha256 } from "js-sha256";

export type ProofInput = {
  merchant: string;
  amount: number | string | null;
  date: string;
};

export type NormalizedExpense = {
  merchant: string;
  amount: string;
  date: string;
};

export type ProofError = {
  code:
    | "MISSING_MERCHANT"
    | "MISSING_AMOUNT"
    | "INVALID_AMOUNT"
    | "MISSING_DATE"
    | "INVALID_DATE";
  message: string;
};

export type ProofResult =
  | {
      ok: true;
      normalized: NormalizedExpense;
      baseString: string;
      hash: string;
      proofString: string;
    }
  | {
      ok: false;
      error: ProofError;
    };

export function normalizeExpenseFields(data: ProofInput):
  | { ok: true; fields: NormalizedExpense; baseString: string }
  | { ok: false; error: ProofError } {
  const merchant = data.merchant.trim().toLowerCase().replace(/\s+/g, " ");

  if (!merchant) {
    return {
      ok: false,
      error: {
        code: "MISSING_MERCHANT",
        message: "Merchant is required to generate a proof",
      },
    };
  }

  if (data.amount === null || data.amount === "") {
    return {
      ok: false,
      error: {
        code: "MISSING_AMOUNT",
        message: "Amount is required to generate a proof",
      },
    };
  }

  const parsedAmount =
    typeof data.amount === "number"
      ? data.amount
      : Number(data.amount.replace(/[$₹€,\s]/g, ""));

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_AMOUNT",
        message: "Amount must be a positive number",
      },
    };
  }

  const amount = parsedAmount.toFixed(2);
  const rawDate = data.date.trim();

  if (!rawDate) {
    return {
      ok: false,
      error: {
        code: "MISSING_DATE",
        message: "Date is required to generate a proof",
      },
    };
  }

  const date = normalizeIsoDate(rawDate);

  if (!date) {
    return {
      ok: false,
      error: {
        code: "INVALID_DATE",
        message: "Date must resolve to YYYY-MM-DD",
      },
    };
  }

  const fields = { merchant, amount, date };
  const baseString = buildBaseProofString(fields);

  return { ok: true, fields, baseString };
}

export function buildBaseProofString(fields: NormalizedExpense) {
  return `${fields.merchant}|${fields.amount}|${fields.date}`;
}

export function buildExpenseProofString(
  fields: NormalizedExpense,
  hash: string,
  tx = "",
) {
  const hashProof = `${buildBaseProofString(fields)}|${hash}`;
  return tx ? `${hashProof}|${tx}` : hashProof;
}

export function normalizeExpense(data: ProofInput) {
  const normalized = normalizeExpenseFields(data);

  if (!normalized.ok) {
    return normalized;
  }

  return {
    ok: true as const,
    normalized: normalized.baseString,
  };
}

export function generateExpenseProof(data: ProofInput, tx = ""): ProofResult {
  const normalized = normalizeExpenseFields(data);

  if (!normalized.ok) {
    return normalized;
  }

  const hash = hashNormalizedExpense(normalized.baseString);

  return {
    ok: true,
    normalized: normalized.fields,
    baseString: normalized.baseString,
    hash,
    proofString: buildExpenseProofString(normalized.fields, hash, tx),
  };
}

export function hashNormalizedExpense(normalized: string) {
  return sha256(normalized);
}

function normalizeIsoDate(rawDate: string) {
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!isoMatch) return null;

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return rawDate;
}
