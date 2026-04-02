import { cofhejs, Encryptable, type Environment } from "cofhejs/web";
import { toHex, type Hex, type PublicClient, type WalletClient } from "viem";
import type { CofheEnvironment } from "./cofheEnv";

type CoFheInUint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: string | Uint8Array;
};

function unwrapResult<T>(value: unknown): T {
  if (value && typeof value === "object" && "success" in (value as Record<string, unknown>)) {
    const r = value as {
      success: boolean;
      data?: T;
      error?: { message?: string; cause?: unknown };
    };
    if (!r.success) {
      const parts: string[] = [];
      let msg = r.error?.message ?? "cofhejs operation failed";
      parts.push(msg);
      let c: unknown = r.error?.cause;
      let depth = 0;
      while (c instanceof Error && depth < 5) {
        parts.push(c.message);
        c = "cause" in c ? (c as Error & { cause?: unknown }).cause : undefined;
        depth += 1;
      }
      throw new Error(parts.filter(Boolean).join(" — "));
    }
    return r.data as T;
  }
  return value as T;
}

export type InitCofheOptions = {
  /** When false, skips EIP-712 permit creation (no wallet signature). Use for mock encrypt-only flows. */
  generatePermit?: boolean;
  /** Relax TFHE WASM init when the chain has no FHE precompiles (e.g. vanilla Hardhat). */
  ignoreTfheErrors?: boolean;
};

export async function initCofhe(
  publicClient: PublicClient,
  walletClient: WalletClient | null | undefined,
  environment: CofheEnvironment,
  options?: InitCofheOptions,
) {
  const generatePermit = options?.generatePermit !== false;
  const init = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient ?? undefined,
    environment: environment as Environment,
    generatePermit,
    ignoreErrors:
      environment === "MOCK" ||
      environment === "LOCAL" ||
      options?.ignoreTfheErrors === true,
  });
  unwrapResult(init);
}

export async function encryptSwapAmounts(amountIn: bigint, minOut: bigint) {
  const encrypted = await cofhejs.encrypt([Encryptable.uint64(amountIn), Encryptable.uint64(minOut)]);
  const [encAmountIn, encMinOut] = unwrapResult<[CoFheInUint64, CoFheInUint64]>(encrypted);
  return { encAmountIn, encMinOut };
}

export async function unsealValue(sealedValue: string): Promise<bigint> {
  const raw = await cofhejs.unseal(BigInt(sealedValue) as never, "uint64" as never);
  const value = unwrapResult<bigint | string | number>(raw);
  return BigInt(value);
}

export function getPermission() {
  const permit = cofhejs.getPermit?.();
  const resolved = unwrapResult<{ getPermission: () => unknown } | null>(permit);
  return resolved?.getPermission();
}

export async function encryptSingle(amount: bigint) {
  const encrypted = await cofhejs.encrypt([Encryptable.uint64(amount)]);
  const [single] = unwrapResult<[CoFheInUint64]>(encrypted);
  return single;
}

// Backward-compatible helpers currently used by app code.
export async function unsealCt(ctHash: bigint): Promise<bigint> {
  return unsealValue(ctHash.toString());
}

export function mapCoFheInput(input: CoFheInUint64) {
  const signature: Hex =
    typeof input.signature === "string" ? (input.signature as Hex) : toHex(input.signature);

  return {
    ctHash: input.ctHash,
    securityZone: input.securityZone,
    utype: input.utype,
    signature,
  } as const;
}
