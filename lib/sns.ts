import { Connection, PublicKey } from "@solana/web3.js";
import { performReverseLookup } from "@bonfida/spl-name-service";

const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export async function resolveSnsName(address: string): Promise<string | null> {
  try {
    const connection = new Connection(MAINNET_RPC);
    const owner = new PublicKey(address);
    const domainName = await performReverseLookup(connection, owner);
    return domainName ? `${domainName}.sol` : null;
  } catch (err) {
    console.error("SNS resolution failed:", err);
    return null;
  }
}
