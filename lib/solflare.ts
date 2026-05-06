import Solflare from "@solflare-wallet/sdk";

let instance: Solflare | null = null;

export function getSolflare(): Solflare {
  if (!instance) {
    instance = new Solflare();
  }

  return instance;
}
