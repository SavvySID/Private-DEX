import {
  cofhejs,
  Encryptable,
  FheTypes,
  type CoFheInUint64,
  type Permission,
  type Result,
} from "cofhejs/web";
import { toHex, type Hex, type PublicClient, type WalletClient } from "viem";
import type { CofheEnvironment } from "@/lib/cofheEnv";

function unwrap<T>(r: Result<T>, ctx: string): T {
  if (!r.success) {
    throw new Error(`${ctx}: ${r.error.message}`);
  }
  return r.data;
}

export async function initCofhe(
  publicClient: PublicClient,
  walletClient: WalletClient,
  environment: CofheEnvironment,
) {
  const init = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient,
    environment,
    generatePermit: true,
    ignoreErrors: environment === "MOCK" || environment === "LOCAL",
  });
  if (!init.success) {
    if (environment === "MOCK" || environment === "LOCAL") {
      console.warn("cofhejs.initializeWithViem:", init.error?.message);
    } else {
      unwrap(init, "cofhejs.initializeWithViem");
    }
  }

  try {
    const issuer = await walletClient.getAddresses().then((a) => a[0]);
    const permitRes = await cofhejs.createPermit({ type: "self", issuer });
    if (!permitRes.success && environment !== "MOCK" && environment !== "LOCAL") {
      console.warn("cofhejs.createPermit:", permitRes.error?.message);
    }
  } catch (e) {
    if (environment !== "MOCK" && environment !== "LOCAL") {
      console.warn("cofhejs.createPermit skipped:", e);
    }
  }
}

export async function encryptSwapAmounts(amountIn: bigint, minOut: bigint) {
  const enc = await cofhejs.encrypt([Encryptable.uint64(amountIn), Encryptable.uint64(minOut)]);
  const [encAmountIn, encMinOut] = unwrap(enc, "cofhejs.encrypt");
  return { encAmountIn, encMinOut } as { encAmountIn: CoFheInUint64; encMinOut: CoFheInUint64 };
}

export async function encryptSingle(amount: bigint): Promise<CoFheInUint64> {
  const enc = await cofhejs.encrypt([Encryptable.uint64(amount)]);
  const [one] = unwrap(enc, "cofhejs.encrypt single");
  return one as CoFheInUint64;
}

export function mapCoFheInput(input: CoFheInUint64) {
  const signature: Hex =
    typeof input.signature === "string"
      ? (input.signature as Hex)
      : toHex(new Uint8Array(input.signature as Uint8Array));
  return {
    ctHash: input.ctHash,
    securityZone: input.securityZone,
    utype: input.utype,
    signature,
  } as const;
}

export async function unsealCt(ctHash: bigint): Promise<bigint> {
  const res = await cofhejs.unseal(ctHash, FheTypes.Uint64);
  const data = unwrap(res, "cofhejs.unseal");
  return data as bigint;
}

export async function unsealValue(_sealedValue: string): Promise<bigint> {
  const ctHash = BigInt(_sealedValue);
  return unsealCt(ctHash);
}

export function getPermission(): Permission | null {
  const r = cofhejs.getPermission();
  return r.success ? r.data : null;
}
