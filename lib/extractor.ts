// lib/extractor.ts

export interface ExtractedData {
  merchant: string;
  amount: number | null;
  date: string;
  confidence: "high" | "medium" | "low";
  rawText: string;
}

function cleanText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\n]/g, "") // remove weird OCR chars
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function extractExpenseData(ocrText: string): ExtractedData {
  const cleaned = cleanText(ocrText);

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const amountResult = extractAmount(lines);
  const merchantResult = extractMerchant(lines);
  const date = extractDate(ocrText) || new Date().toISOString().split("T")[0];

  const overallConfidence =
    amountResult.confidence === "low" || merchantResult.confidence === "low"
      ? "low"
      : amountResult.confidence === "medium" ||
          merchantResult.confidence === "medium"
        ? "medium"
        : "high";

  return {
    merchant: merchantResult.value,
    amount: amountResult.value,
    date,
    confidence: overallConfidence,
    rawText: cleaned,
  };
}

// Helpers

function extractAmount(lines: string[]): {
  value: number | null;
  confidence: "high" | "medium" | "low";
} {
  // Strategy 1: explicit total marker
  const totalRegex =
    /(total|grand\s*total|amount)\s*[:\s\-]*\$?\s*(\d+(?:[.,]\d{2}))/i;
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) {
      const num = parseAmountString(match[2]);
      if (num !== null) return { value: num, confidence: "high" };
    }
  }

  // Strategy 2: largest price-like number with two decimal places
  const priceCandidates = lines
    .map((line) => {
      const m = line.match(/(\d+\.\d{2})\b/);
      return m ? parseFloat(m[1]) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => b - a)
    .filter((n) => n < 100000); // avoid garbage huge numbers

  if (priceCandidates.length > 0) {
    const confidence = priceCandidates.length === 1 ? "high" : "medium";
    return { value: priceCandidates[0], confidence };
  }

  // Strategy 3: any number with two decimal places from whole text
  const wholeText = lines.join(" ");
  const fallbackMatch = wholeText.match(/(\d+\.\d{2})/);
  if (fallbackMatch) {
    return { value: parseFloat(fallbackMatch[1]), confidence: "low" };
  }

  return { value: null, confidence: "low" };
}

function parseAmountString(raw: string): number | null {
  const clean = raw.replace(/[₹$€,\s]/g, "").replace(/,/g, ".");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}
function extractMerchant(lines: string[]): {
  value: string;
  confidence: "high" | "medium" | "low";
} {
  const blacklist = [
    "receipt",
    "invoice",
    "tax",
    "total",
    "amount",
    "thank",
    "payment",
    "cash",
    "card",
    "auth",
    "terminal",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // ❌ Skip junk lines
    if (blacklist.some((b) => lower.includes(b))) continue;

    // ❌ Skip numeric-heavy lines
    if ((line.match(/\d/g) || []).length > line.length / 2) continue;

    // ❌ Skip very short lines
    if (line.length < 4) continue;

    return {
      value: line.replace(/\s{2,}/g, " ").trim(),
      confidence: "medium",
    };
  }

  return {
    value: lines[0] || "Unknown Merchant",
    confidence: "low",
  };
}
function extractDate(text: string): string | null {
  // Strategy 1: explicit date-like patterns only (DD-MM-YYYY or MM-DD-YYYY)
  // Must be bounded — not part of a longer number sequence
  const dmyRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
  const matches = [...text.matchAll(dmyRegex)];

  for (const match of matches) {
    const a = parseInt(match[1]);
    const b = parseInt(match[2]);
    const year = parseInt(match[3]);

    // Sanity check year
    if (year < 2000 || year > 2100) continue;

    let day: number, month: number;

    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      day = b;
      month = a;
    } else {
      day = a;
      month = b;
    } // default DD-MM

    if (month < 1 || month > 12) continue;
    if (day < 1 || day > 31) continue;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      const yyyy = year;
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Strategy 2: YYYY-MM-DD (strict — must have valid month/day ranges)
  const isoRegex = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g;
  const isoMatches = [...text.matchAll(isoRegex)];

  for (const match of isoMatches) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    if (year < 2000 || year > 2100) continue;
    if (month < 1 || month > 12) continue;
    if (day < 1 || day > 31) continue;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date.toISOString().split("T")[0];
    }
  }

  return null;
}

function getMonthIndex(abbr: string): number {
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return months.indexOf(abbr.toLowerCase());
}
