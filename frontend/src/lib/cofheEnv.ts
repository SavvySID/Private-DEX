export type CofheEnvironment = "MOCK" | "LOCAL" | "TESTNET" | "MAINNET";

function parseEnvOverride(): CofheEnvironment | undefined {
  const v = process.env.NEXT_PUBLIC_COFHE_ENVIRONMENT?.toUpperCase();
  if (v === "MOCK" || v === "LOCAL" || v === "TESTNET" || v === "MAINNET") {
    return v;
  }
  return undefined;
}

/**
 * CoFHE WASM/SDK environment for `cofhejs.initialize`.
 *
 * **Do not use `MOCK` on Hardhat with this repo:** `cofhejs@0.3.x` treats the chain as “mock” only if
 * predeploys exist at `0x…0100` / `0x…0200`, but `@cofhe/hardhat-plugin` deploys the ZK mock at `0x…5001`.
 * With `MOCK`, CoFHE URLs are cleared and cofhejs then tries to fetch keys with no `coFheUrl` → init error.
 *
 * Use **TESTNET** (Fhenix testnet endpoints) for client encrypt on both Arbitrum Sepolia and local 31337.
 * Override with `NEXT_PUBLIC_COFHE_ENVIRONMENT` if you know what you’re doing.
 */
export function getCofheEnvironment(): CofheEnvironment {
  const override = parseEnvOverride();
  if (override) return override;
  return "TESTNET";
}
