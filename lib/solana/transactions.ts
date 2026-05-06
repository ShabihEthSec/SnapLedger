import { createSolanaRpc } from "@solana/kit";

import {
  Transaction,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

export async function buildMemoTransaction(
  feePayer: PublicKey,
  memoInstruction: TransactionInstruction,
  rpcUrl: string,
): Promise<{
  transaction: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const rpc = createSolanaRpc(rpcUrl);

  const { value: latest } = await rpc.getLatestBlockhash().send();

  const tx = new Transaction();

  tx.feePayer = feePayer;
  tx.recentBlockhash = latest.blockhash;

  tx.add(memoInstruction);

  return {
    transaction: tx,
    blockhash: latest.blockhash,
    lastValidBlockHeight: Number(latest.lastValidBlockHeight),
  };
}
