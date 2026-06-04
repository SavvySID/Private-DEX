export type CofheEnvironment = "MOCK" | "LOCAL" | "TESTNET" | "MAINNET";

function parseEnvOverride(): CofheEnvironment | undefined {
  const v = process.env.NEXT_PUBLIC_COFHE_ENVIRONMENT?.toUpperCase();
  if (v === "MOCK" || v === "LOCAL" || v === "TESTNET" || v === "MAINNET") {
    return v;
  }
  return undefined;
}

/**
 * CoFHE environment hint passed to `initCofhe`.
 *
 * With `@cofhe/sdk@0.6.x` the actual behavior (mock vs. real coprocessor) is derived from the
 * connected chain's config in `supportedChains` (arbSepolia = TESTNET, hardhat = MOCK). This value
 * is mainly used by the app to gate the network check. Defaults to TESTNET (Arbitrum Sepolia);
 * override with `NEXT_PUBLIC_COFHE_ENVIRONMENT` if needed.
 */
export function getCofheEnvironment(): CofheEnvironment {
  const override = parseEnvOverride();
  if (override) return override;
  return "TESTNET";
}
