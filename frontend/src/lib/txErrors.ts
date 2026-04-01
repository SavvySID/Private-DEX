export function formatTransactionError(err: unknown): string {
  if (err === null || err === undefined) return "Unknown error";

  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.shortMessage === "string") return o.shortMessage;
    if (typeof o.details === "string") return o.details;
    if (typeof o.message === "string") {
      const m = o.message;
      if (m.includes("User rejected") || m.includes("user rejected")) {
        return "Transaction rejected in wallet.";
      }
      if (
        m.includes("InvalidEncryptedInput") ||
        m.includes("invalid encrypted") ||
        m.includes("CoFhe")
      ) {
        return "FHE input was rejected on-chain. Use Arbitrum Sepolia + CoFHE testnet with real cofhejs encryption, or a Fhenix dev node for local Hardhat.";
      }
      return m;
    }
  }

  if (err instanceof Error) {
    if (err.message.includes("User rejected") || err.message.includes("user rejected")) {
      return "Transaction rejected in wallet.";
    }
    return err.message;
  }

  return String(err);
}
