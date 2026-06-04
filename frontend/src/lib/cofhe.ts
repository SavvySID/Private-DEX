import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";
import { Encryptable, FheTypes, type CofheClient, type EncryptedItemInput } from "@cofhe/sdk";
import { PermitUtils } from "@cofhe/sdk/permits";
import { toHex, type Hex, type PublicClient, type WalletClient } from "viem";
import type { CofheEnvironment } from "./cofheEnv";

/**
 * Encrypted input shape consumed by the on-chain contracts (InEuint64 / InEbool / ...).
 * Matches @cofhe/sdk's EncryptedItemInput.
 */
type CoFheInUint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

const UNSUPPORTED_CHAIN_MESSAGE =
  "CoFHE is only supported on Arbitrum Sepolia (chain ID 421614). Switch your wallet to Arbitrum Sepolia and try again.";

/**
 * The `tfhe` WASM build allocates a SHARED WebAssembly.Memory, which only works
 * when the page is cross-origin isolated (SharedArrayBuffer enabled). Without the
 * COOP/COEP headers the FHE key deserializes into garbage. Fail fast with guidance.
 */
function assertCrossOriginIsolated() {
  if (typeof window === "undefined") return;
  const isolated = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
  const hasSab = typeof SharedArrayBuffer !== "undefined";
  if (!isolated || !hasSab) {
    throw new Error(
      "FHE encryption requires a cross-origin isolated page (SharedArrayBuffer). " +
        "Restart the dev server and hard-reload so the COOP/COEP headers apply. " +
        "If you're behind a proxy, ensure it forwards " +
        "'Cross-Origin-Opener-Policy: same-origin' and 'Cross-Origin-Embedder-Policy: credentialless'.",
    );
  }
}

/** Singleton CoFHE client. `useWorkers: false` keeps ZK proving on the main thread
 * (avoids bundling a web worker through Next, at the cost of a brief UI pause). */
let _client: CofheClient | null = null;
function getClient(): CofheClient {
  if (!_client) {
    _client = createCofheClient(
      createCofheConfig({
        supportedChains: [chains.arbSepolia, chains.hardhat],
        useWorkers: false,
      }),
    );
  }
  return _client;
}

export type InitCofheOptions = {
  /** When true, eagerly create + sign an EIP-712 self-permit during init (needed before decrypt/unseal). */
  generatePermit?: boolean;
  /** Kept for API compatibility; the SDK derives mock behavior from the chain config. */
  ignoreTfheErrors?: boolean;
  /** Wallet chain from wagmi `useChainId()` — preferred over RPC client for network checks. */
  walletChainId?: number;
};

export async function initCofhe(
  publicClient: PublicClient,
  walletClient: WalletClient | null | undefined,
  environment: CofheEnvironment,
  options?: InitCofheOptions,
) {
  if (environment === "TESTNET" || environment === "MAINNET") {
    const chainId =
      options?.walletChainId ??
      publicClient.chain?.id ??
      (await publicClient.getChainId());
    if (Number(chainId) !== ARBITRUM_SEPOLIA_CHAIN_ID) {
      throw new Error(`${UNSUPPORTED_CHAIN_MESSAGE} (connected chain ID: ${chainId})`);
    }
  }

  assertCrossOriginIsolated();

  if (!walletClient) {
    throw new Error("Connect your wallet on Arbitrum Sepolia before using encrypted features.");
  }

  const client = getClient();
  await client.connect(publicClient, walletClient);

  if (options?.generatePermit) {
    const { chainId, account } = client.connection;
    if (chainId != null && account != null) {
      await client.permits.getOrCreateSelfPermit(chainId, account);
    }
  }
}

async function ensureSelfPermit() {
  const client = getClient();
  const { chainId, account } = client.connection;
  if (chainId == null || account == null) {
    throw new Error("CoFHE is not connected. Call initCofhe first.");
  }
  await client.permits.getOrCreateSelfPermit(chainId, account);
}

export async function encryptSwapAmounts(amountIn: bigint, minOut: bigint) {
  const client = getClient();
  const [encAmountIn, encMinOut] = await client
    .encryptInputs([Encryptable.uint64(amountIn), Encryptable.uint64(minOut)])
    .setUseWorker(false)
    .execute();
  return {
    encAmountIn: encAmountIn as EncryptedItemInput,
    encMinOut: encMinOut as EncryptedItemInput,
  };
}

export async function encryptSingle(amount: bigint) {
  const client = getClient();
  const [single] = await client
    .encryptInputs([Encryptable.uint64(amount)])
    .setUseWorker(false)
    .execute();
  return single as EncryptedItemInput;
}

export async function unsealValue(sealedValue: string): Promise<bigint> {
  const client = getClient();
  await ensureSelfPermit();
  const value = await client
    .decryptForView(BigInt(sealedValue), FheTypes.Uint64)
    .withPermit()
    .execute();
  return BigInt(value);
}

export function getPermission() {
  const client = getClient();
  const { chainId, account } = client.connection;
  if (chainId == null || account == null) return undefined;
  const permit = client.permits.getActivePermit(chainId, account);
  return permit ? PermitUtils.getPermission(permit) : undefined;
}

// Backward-compatible helper used by app code.
export async function unsealCt(ctHash: bigint): Promise<bigint> {
  return unsealValue(ctHash.toString());
}

export function mapCoFheInput(input: CoFheInUint64 | EncryptedItemInput) {
  const signature: Hex =
    typeof input.signature === "string" ? (input.signature as Hex) : toHex(input.signature);

  return {
    ctHash: input.ctHash,
    securityZone: input.securityZone,
    utype: input.utype,
    signature,
  } as const;
}
