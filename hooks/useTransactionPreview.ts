import { useCallback } from "react";

import { Transaction } from "@solana/web3.js";

import { getConnection } from "@/lib/solana/connection";

export function useTransactionPreview() {
  const simulate = useCallback(async (tx: Transaction) => {
    const connection = getConnection();

    const simulation = await connection.simulateTransaction(tx);

    const fee = await connection.getFeeForMessage(
      tx.compileMessage(),
      "confirmed",
    );

    return {
      simulation: simulation.value,
      fee: fee.value,
    };
  }, []);

  return { simulate };
}
