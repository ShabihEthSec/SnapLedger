import {
  Connection,
  clusterApiUrl,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";

// Devnet connection
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ⚠️ DEMO WALLET (do not use in production)
const payer = Keypair.generate();

export async function sendProofToSolana(hash: string) {
  try {
    // Airdrop SOL for fees (only needed once per session)
    const airdropSig = await connection.requestAirdrop(
      payer.publicKey,
      1_000_000_000, // 1 SOL
    );
    await connection.confirmTransaction(airdropSig);

    // Create memo instruction
    const memoProgramId = new PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    );

    const memoInstruction = {
      keys: [],
      programId: memoProgramId,
      data: Buffer.from(hash),
    };

    const transaction = new Transaction().add(memoInstruction);

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      payer,
    ]);

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
  } catch (err) {
    console.error("Solana error:", err);
    throw new Error("Failed to send proof to Solana");
  }
}
