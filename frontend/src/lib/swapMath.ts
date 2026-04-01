/** Reference price: USDC per 1 ETH (human), aligned with demo UI. */
export const USDC_PER_ETH = 2451.32;

const RATE_NUM = BigInt(245132);
const RATE_DEN = BigInt(100);

export const UINT64_MAX = BigInt("18446744073709551615");

/** Slippage: min out = 98% of quote → 200 bps. */
const SLIPPAGE_BPS = BigInt(200);

/**
 * Human decimal string → uint64-safe fixed-point (6 fractional digits).
 * Example: "1.5" → 1_500_000n (represents 1.500000 units of the token).
 */
export function humanToFixed6(human: string): bigint {
  const t = human.trim();
  if (!t) return BigInt(0);
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Enter a valid positive amount.");
  }
  const scaled = BigInt(Math.round(n * 1_000_000));
  if (scaled > UINT64_MAX) {
    throw new Error("Amount too large for euint64 CoFHE payload.");
  }
  return scaled;
}

/** Format fixed-6 bigint for display (trim trailing zeros, cap fractional length). */
export function formatFixed6(b: bigint, maxFrac = 8): string {
  const z = BigInt(0);
  const mil = BigInt(1_000_000);
  if (b === z) return "";
  const neg = b < z;
  const v = neg ? -b : b;
  const whole = v / mil;
  let frac = v % mil;
  let fracStr = frac.toString().padStart(6, "0");
  if (maxFrac < 6) {
    fracStr = fracStr.slice(0, maxFrac);
  }
  fracStr = fracStr.replace(/0+$/, "");
  const core = fracStr ? `${whole}.${fracStr}` : `${whole}`;
  return neg ? `-${core}` : core;
}

/** ETH_fixed6 → USDC_fixed6 (same 6dp semantics). */
export function ethToUsdcFixed6(ethFixed6: bigint): bigint {
  return (ethFixed6 * RATE_NUM + RATE_DEN / BigInt(2)) / RATE_DEN;
}

/** USDC_fixed6 → ETH_fixed6. */
export function usdcToEthFixed6(usdcFixed6: bigint): bigint {
  return (usdcFixed6 * RATE_DEN + RATE_NUM / BigInt(2)) / RATE_NUM;
}

export function applyMinOutSlippage(outFixed6: bigint): bigint {
  const tenK = BigInt(10_000);
  return (outFixed6 * (tenK - SLIPPAGE_BPS)) / tenK;
}

export function isEthUsdcPair(fromSymbol: string, toSymbol: string): boolean {
  return (
    (fromSymbol === "ETH" && toSymbol === "USDC") || (fromSymbol === "USDC" && toSymbol === "ETH")
  );
}
