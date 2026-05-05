// lib/goldrush.ts
import "server-only";
import { createSolanaRpc, address } from "@solana/kit";

// ---------- Types ----------
export interface TransactionItem {
  block_signed_at: string;
  tx_hash: string;
  successful: boolean;
  from_address: string;
  to_address: string;
  value_quote: number;
  log_events: any[];
  memo?: string | null;
}

export interface TokenBalance {
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  balance: string;
  quote: number;
}

export interface CounterpartyRisk {
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  transactionCount: number;
  tokenCount: number;
  totalValueUSD: number;
  details: {
    ageInDays: number;
    avgTransactionValue: number;
    hasSuspiciousActivity: boolean;
    isNewWallet: boolean;
  };
  warnings: string[];
  summary: string;
  walletType: string;
  thirtyDayVolume: number;
}

// ---------- Helpers ----------
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    const masked = u.toString().replace(/(api[_-]?key=)[^&]+/gi, "$1***");
    return masked.replace(/(\/[A-Za-z0-9]{20,})/g, "/***");
  } catch {
    return url.replace(/(\/[A-Za-z0-9]{20,})/g, "/***");
  }
}

async function fetchSignaturesFromRpc(
  rpcUrl: string,
  walletAddress: string,
  options: { limit: number; before?: string },
  timeoutMs = 10_000,
): Promise<readonly { signature: string; blockTime?: number | null }[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const rpc = createSolanaRpc(rpcUrl);
    const walletAddr = address(walletAddress);

    const rpcOptions: { limit: number; before?: string } = {
      limit: options.limit,
    };
    if (options.before) {
      rpcOptions.before = options.before;
    }

    const signaturesPromise = rpc
      .getSignaturesForAddress(walletAddr, rpcOptions)
      .send();

    const timeoutPromise = new Promise<never>((_, reject) =>
      controller.signal.addEventListener("abort", () =>
        reject(new Error("RPC call timed out")),
      ),
    );

    return await Promise.race([signaturesPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Hybrid Transaction Fetching ----------
async function getRecentTransactions(
  addressString: string,
): Promise<TransactionItem[]> {
  // 1. Sanitise input
  const trimmed = addressString.trim();
  if (!BASE58_REGEX.test(trimmed)) {
    console.error(
      `[getRecentTransactions] Invalid Solana address format: "${trimmed}"`,
    );
    return [];
  }
  console.log(`[getRecentTransactions] Analysing address: ${trimmed}`);

  // 2. RPC endpoints
  const primaryRpc =
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const fallbackRpc = "https://api.mainnet-beta.solana.com";
  console.log(`[getRecentTransactions] Primary RPC: ${maskUrl(primaryRpc)}`);

  const PAGE_SIZE = 50;
  const MAX_PAGES = 5;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // Helper: fetch one page from primary with fallback
  async function fetchOnePage(
    before?: string,
  ): Promise<readonly { signature: string; blockTime?: number | null }[]> {
    try {
      const sigs = await fetchSignaturesFromRpc(primaryRpc, trimmed, {
        limit: PAGE_SIZE,
        before,
      });
      console.log(
        `[getRecentTransactions] Primary RPC page (before=${before?.slice(0, 12) ?? "start"}) → ${sigs.length} sig(s).`,
      );
      return sigs;
    } catch (primaryErr) {
      console.error(
        `[getRecentTransactions] Primary RPC page failed:`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr,
      );

      if (primaryRpc === fallbackRpc) {
        console.error(
          `[getRecentTransactions] Primary and fallback are identical – skipping fallback.`,
        );
        return [];
      }

      console.log(
        `[getRecentTransactions] Trying fallback RPC: ${maskUrl(fallbackRpc)}`,
      );
      try {
        const sigs = await fetchSignaturesFromRpc(fallbackRpc, trimmed, {
          limit: PAGE_SIZE,
          before,
        });
        console.log(
          `[getRecentTransactions] Fallback RPC page → ${sigs.length} sig(s).`,
        );
        return sigs;
      } catch (fallbackErr) {
        console.error(
          `[getRecentTransactions] Fallback RPC page also failed:`,
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
        );
        return [];
      }
    }
  }

  // 3. Paginate backward until we have a signature >30 days old or hit MAX_PAGES
  const allSignatures: { signature: string; blockTime?: number | null }[] = [];
  let cursor: string | undefined = undefined;
  const now = Date.now();

  for (let page = 0; page < MAX_PAGES; page++) {
    const page_sigs = await fetchOnePage(cursor);

    if (page_sigs.length === 0) {
      console.log(
        `[getRecentTransactions] Empty page at page ${page + 1} – stopping pagination.`,
      );
      break;
    }

    // page_sigs are newest-first; push them all
    for (const s of page_sigs) {
      allSignatures.push({ signature: s.signature, blockTime: s.blockTime });
    }

    const oldestSig = page_sigs[page_sigs.length - 1];
    const oldestBlockTime = oldestSig.blockTime;

    // blockTime is Unix seconds (may be null for very old/unconfirmed slots)
    const oldestMs =
      oldestBlockTime != null ? Number(oldestBlockTime) * 1000 : null;

    const oldestAge = oldestMs != null ? now - oldestMs : null;
    console.log(
      `[getRecentTransactions] Page ${page + 1}: oldest sig ${oldestSig.signature.slice(0, 12)}… age=${oldestAge != null ? Math.round(oldestAge / 86_400_000) + "d" : "unknown"}`,
    );

    // Stop if:
    //  a) we found a sig older than 30 days (we have true age)
    //  b) fewer than PAGE_SIZE returned (no more pages exist)
    //  c) blockTime is null – can't determine age, treat as old enough
    const foundOldEnough = oldestAge == null || oldestAge >= THIRTY_DAYS_MS;
    const noMorePages = page_sigs.length < PAGE_SIZE;

    if (foundOldEnough || noMorePages) {
      if (foundOldEnough)
        console.log(
          `[getRecentTransactions] Found signature older than 30 days – stopping pagination.`,
        );
      if (noMorePages)
        console.log(
          `[getRecentTransactions] Received fewer than ${PAGE_SIZE} signatures – end of history.`,
        );
      break;
    }

    // Advance cursor to oldest signature on this page for next page
    cursor = oldestSig.signature;
  }

  console.log(
    `[getRecentTransactions] Total signatures collected: ${allSignatures.length}`,
  );

  if (allSignatures.length === 0) {
    console.warn(
      `[getRecentTransactions] No signatures found for ${trimmed}. Wallet may be inactive or RPC is rate-limiting.`,
    );
    return [];
  }

  // 4. Enrich every signature via GoldRush; fall back to minimal stub on failure
  const now_iso = new Date().toISOString();

  const txDetails = await Promise.all(
    allSignatures.map(async ({ signature: sigStr, blockTime }) => {
      // Derive a best-effort timestamp from blockTime if GoldRush is unavailable
      const fallbackTimestamp =
        blockTime != null
          ? new Date(Number(blockTime) * 1000).toISOString()
          : now_iso;

      try {
        const res = await fetch(
          `https://api.covalenthq.com/v1/solana-mainnet/transaction_v2/${sigStr}/?key=${process.env.GOLDRUSH_API_KEY}`,
        );

        if (!res.ok) {
          console.warn(
            `[getRecentTransactions] GoldRush HTTP ${res.status} for sig ${sigStr.slice(0, 12)}… – using stub.`,
          );
          return {
            block_signed_at: fallbackTimestamp,
            tx_hash: sigStr,
            successful: true,
            from_address: trimmed,
            to_address: "",
            value_quote: 0,
            log_events: [],
            memo: null,
          } satisfies TransactionItem;
        }

        const data = await res.json();
        const item = data?.data?.items?.[0];

        if (!item) {
          console.warn(
            `[getRecentTransactions] GoldRush returned no item for sig ${sigStr.slice(0, 12)}… – using stub.`,
          );
          return {
            block_signed_at: fallbackTimestamp,
            tx_hash: sigStr,
            successful: true,
            from_address: trimmed,
            to_address: "",
            value_quote: 0,
            log_events: [],
            memo: null,
          } satisfies TransactionItem;
        }

        let memo: string | null = null;
        if (item.log_events) {
          const memoEvent = item.log_events.find((e: any) =>
            e.decoded?.name?.toLowerCase()?.includes("memo"),
          );
          if (memoEvent?.decoded?.params?.[0]?.value) {
            memo = memoEvent.decoded.params[0].value;
          }
        }

        return {
          block_signed_at: item.block_signed_at ?? fallbackTimestamp,
          tx_hash: item.tx_hash ?? sigStr,
          successful: item.successful ?? true,
          from_address: item.from_address ?? trimmed,
          to_address: item.to_address ?? "",
          value_quote: item.value_quote ?? 0,
          log_events: item.log_events ?? [],
          memo,
        } satisfies TransactionItem;
      } catch (err) {
        console.error(
          `[getRecentTransactions] Exception enriching sig ${sigStr.slice(0, 12)}…:`,
          err instanceof Error ? err.message : err,
        );
        return {
          block_signed_at: fallbackTimestamp,
          tx_hash: sigStr,
          successful: true,
          from_address: trimmed,
          to_address: "",
          value_quote: 0,
          log_events: [],
          memo: null,
        } satisfies TransactionItem;
      }
    }),
  );

  const valid = txDetails.filter(Boolean) as TransactionItem[];
  console.log(
    `[getRecentTransactions] Returning ${valid.length} TransactionItem(s) for ${trimmed}.`,
  );
  return valid;
}

// ---------- Token Balances ----------
async function getTokenBalances(address: string): Promise<TokenBalance[]> {
  const res = await fetch(
    `https://api.covalenthq.com/v1/solana-mainnet/address/${address}/balances_v2/?key=${process.env.GOLDRUSH_API_KEY}`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.items || [];
}

// ---------- Risk Engine ----------
export async function analyzeWallet(
  address: string,
): Promise<CounterpartyRisk> {
  const [transactions, tokenBalances] = await Promise.all([
    getRecentTransactions(address),
    getTokenBalances(address),
  ]);

  const txCount = transactions.length;
  const tokenCount = tokenBalances.length;
  const totalValueUSD = tokenBalances.reduce((sum, t) => sum + t.quote, 0);

  let ageInDays = 0;
  if (transactions.length > 0) {
    const timestamps = transactions
      .map((tx) => new Date(tx.block_signed_at).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length > 0) {
      const oldest = Math.min(...timestamps);
      ageInDays = (Date.now() - oldest) / (1000 * 60 * 60 * 24);
    }
  }

  const avgValue =
    txCount > 0
      ? transactions.reduce((sum, tx) => sum + tx.value_quote, 0) / txCount
      : 0;

  const isNewWallet = ageInDays < 7 && txCount < 10;
  const hasSuspiciousActivity = txCount > 0 && txCount < 3 && avgValue > 1000;

  let score = 50;
  if (txCount > 10) score += 10;
  if (ageInDays > 365) score += 15;
  if (avgValue > 100 && avgValue < 5000) score += 5;
  if (isNewWallet) score -= 20;
  if (hasSuspiciousActivity) score -= 25;
  if (txCount === 0) score -= 30;
  score = Math.max(0, Math.min(100, score));

  let level: "LOW" | "MEDIUM" | "HIGH";
  if (score >= 70) level = "LOW";
  else if (score >= 40) level = "MEDIUM";
  else level = "HIGH";

  // ---------- Warnings ----------
  const warnings: string[] = [];

  if (txCount === 0) {
    warnings.push("No transaction history found for this wallet.");
  }
  if (isNewWallet) {
    warnings.push(
      "Wallet is new (less than 7 days old with fewer than 10 transactions).",
    );
  }
  if (hasSuspiciousActivity) {
    warnings.push(
      "Suspicious activity detected: very few transactions with unusually high average value.",
    );
  }
  if (score < 40) {
    warnings.push(
      "Overall risk score is high — exercise caution before transacting with this wallet.",
    );
  }
  if (avgValue > 5000) {
    warnings.push(
      "Average transaction value is exceptionally high (above $5,000).",
    );
  }
  if (tokenCount === 0 && txCount > 0) {
    warnings.push("Wallet holds no tokens despite having transaction history.");
  }
  if (ageInDays > 0 && ageInDays < 30 && txCount > 20) {
    warnings.push("Unusually high transaction frequency for a young wallet.");
  }

  // ---------- Wallet Type ----------
  let walletType: string;
  if (txCount === 0) {
    walletType = "inactive";
  } else if (isNewWallet) {
    walletType = "new";
  } else if (txCount > 50) {
    walletType = "high_volume";
  } else {
    walletType = "active";
  }

  // ---------- 30-Day Volume ----------
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const thirtyDayVolume = transactions.reduce((sum, tx) => {
    const ts = new Date(tx.block_signed_at).getTime();
    return !isNaN(ts) && ts >= thirtyDaysAgo ? sum + tx.value_quote : sum;
  }, 0);

  // ---------- Summary ----------
  const formattedScore = score.toFixed(0);
  const formattedVolume = thirtyDayVolume.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  let summary: string;
  if (txCount === 0) {
    summary = `Inactive wallet with no transaction history — risk score ${formattedScore}/100 (${level}).`;
  } else if (level === "LOW") {
    summary = `Low-risk ${walletType} wallet with ${txCount} transactions, ${Math.round(
      ageInDays,
    )} days of history, and ${formattedVolume} in 30-day volume — score ${formattedScore}/100.`;
  } else if (level === "MEDIUM") {
    summary = `Moderate-risk ${walletType} wallet (score ${formattedScore}/100) — ${txCount} transactions over ${Math.round(
      ageInDays,
    )} days; review warnings before proceeding.`;
  } else {
    summary = `High-risk wallet (score ${formattedScore}/100): ${warnings.length} flag${
      warnings.length !== 1 ? "s" : ""
    } detected — proceed with caution.`;
  }

  return {
    level,
    score,
    transactionCount: txCount,
    tokenCount,
    totalValueUSD,
    details: {
      ageInDays: Math.round(ageInDays),
      avgTransactionValue: avgValue,
      hasSuspiciousActivity,
      isNewWallet,
    },
    warnings,
    summary,
    walletType,
    thirtyDayVolume,
  };
}
