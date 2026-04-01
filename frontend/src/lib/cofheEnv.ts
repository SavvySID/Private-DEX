import { hardhat } from "viem/chains";
import { configuredChain } from "@/lib/contracts";

export type CofheEnvironment = "MOCK" | "LOCAL" | "TESTNET" | "MAINNET";

function parseEnvOverride(): CofheEnvironment | undefined {
  const v = process.env.NEXT_PUBLIC_COFHE_ENVIRONMENT?.toUpperCase();
  if (v === "MOCK" || v === "LOCAL" || v === "TESTNET" || v === "MAINNET") {
    return v;
  }
  return undefined;
}

/** CoFHE mode: MOCK on local Hardhat for SDK dev; TESTNET on Arbitrum Sepolia (real coprocessor). */
export function getCofheEnvironment(): CofheEnvironment {
  const override = parseEnvOverride();
  if (override) return override;
  return configuredChain.id === hardhat.id ? "MOCK" : "TESTNET";
}
