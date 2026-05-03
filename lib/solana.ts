import {
  Connection,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import { Buffer } from "buffer";

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

// ✅ SINGLE SOURCE OF TRUTH
function getOrCreatePayer(): Keypair {
  const saved = localStorage.getItem("snapledger_payer");

  if (saved) {
    try {
      const secretKey = JSON.parse(saved);
      if (!Array.isArray(secretKey) || secretKey.length !== 64) {
        throw new Error("Invalid saved payer key");
      }

      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch {
      localStorage.removeItem("snapledger_payer");
    }
  }

  const kp = Keypair.generate();

  localStorage.setItem(
    "snapledger_payer",
    JSON.stringify(Array.from(kp.secretKey)),
  );

  console.log("Wallet (save this):", kp.publicKey.toBase58());

  return kp;
}

// ✅ NO faucet logic here
export async function ensureBalance(): Promise<string> {
  const payer = getOrCreatePayer();
  return payer.publicKey.toBase58();
}

// ✅ CLEAN transaction sender
export async function sendProofToSolana(hash: string) {
  const payer = getOrCreatePayer();

  let balance: number;
  try {
    balance = await connection.getBalance(payer.publicKey);
  } catch (err) {
    console.error("Solana balance check failed:", err);
    throw new Error(
      `Failed to read devnet wallet balance. Check NEXT_PUBLIC_SOLANA_RPC_URL or use a devnet RPC endpoint that does not require an API key. Wallet: ${payer.publicKey.toBase58()}`,
    );
  }

  if (balance < 5_000) {
    throw new Error(
      `No SOL.\nFund this devnet wallet:\n${payer.publicKey.toBase58()}`,
    );
  }

  const tx = new Transaction().add({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(hash),
  });

  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);

  return {
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    payer: payer.publicKey.toBase58(),
  };
}
