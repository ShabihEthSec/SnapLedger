"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getSolflare } from "@/lib/solflare";

export function useSolflare() {
  const wallet = getSolflare();

  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);

  const [connected, setConnected] = useState(false);

  const [isSolflareBrowser, setIsSolflareBrowser] = useState(false);

  useEffect(() => {
    setIsSolflareBrowser(
      typeof window !== "undefined" && !!(window as any).solflare?.isSolflare,
    );

    const onConnect = () => {
      setConnected(true);
      setPublicKey(wallet.publicKey ?? null);
    };

    const onDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
    };

    wallet.on("connect", onConnect);
    wallet.on("disconnect", onDisconnect);

    if (wallet.publicKey) {
      setConnected(true);
      setPublicKey(wallet.publicKey);
    } else {
      (wallet as any).connect?.({ onlyIfTrusted: true }).catch(() => {});
    }

    return () => {
      wallet.off("connect", onConnect);
      wallet.off("disconnect", onDisconnect);
    };
  }, [wallet]);

  const connect = useCallback(async () => {
    await wallet.connect();
  }, [wallet]);

  const disconnect = useCallback(async () => {
    await wallet.disconnect();
  }, [wallet]);

  const signAndSendTransaction = useCallback(
    async (tx: Transaction): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const result: any = await wallet.signAndSendTransaction(tx);

      return typeof result === "string" ? result : result.signature;
    },
    [wallet],
  );

  return {
    publicKey,
    connected,
    connect,
    disconnect,
    signAndSendTransaction,
    isSolflareBrowser,
  };
}
