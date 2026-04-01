import { createPublicClient, http, type Abi, type Address } from "viem";
import { arbitrumSepolia, hardhat } from "viem/chains";
import orderBookArtifact from "./abis/PrivateOrderBook.json";
import ammArtifact from "./abis/PrivateAMM.json";
import vaultArtifact from "./abis/PrivateVault.json";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const orderBook = (process.env.NEXT_PUBLIC_ORDER_BOOK_ADDRESS as Address | undefined) ?? ZERO;
const amm = (process.env.NEXT_PUBLIC_AMM_ADDRESS as Address | undefined) ?? ZERO;
const vault = (process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined) ?? ZERO;

export const ORDER_BOOK_ADDRESS = orderBook;
export const AMM_ADDRESS = amm;
export const VAULT_ADDRESS = vault;

export const ORDER_BOOK_ABI = orderBookArtifact.abi as Abi;
export const AMM_ABI = ammArtifact.abi as Abi;
export const VAULT_ABI = vaultArtifact.abi as Abi;

export function isOrderBookDeployed(): boolean {
  return ORDER_BOOK_ADDRESS !== ZERO;
}

const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? arbitrumSepolia.id);

export const configuredChain: typeof arbitrumSepolia | typeof hardhat =
  envChainId === hardhat.id ? hardhat : arbitrumSepolia;

const rpcUrl =
  configuredChain.id === hardhat.id
    ? (process.env.NEXT_PUBLIC_LOCAL_RPC ?? "http://127.0.0.1:8545")
    : (process.env.NEXT_PUBLIC_RPC_URL ?? arbitrumSepolia.rpcUrls.default.http[0]);

export const publicClient = createPublicClient({
  chain: configuredChain,
  transport: http(rpcUrl),
});
