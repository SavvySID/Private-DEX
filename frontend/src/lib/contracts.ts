import { createPublicClient, http, type Abi } from "viem";
import { arbitrumSepolia, hardhat } from "viem/chains";
import orderBookAbi from "./abis/PrivateOrderBook.json";
import ammAbi from "./abis/PrivateAMM.json";
import vaultAbi from "./abis/PrivateVault.json";

export const ORDER_BOOK_ADDRESS = process.env.NEXT_PUBLIC_ORDER_BOOK_ADDRESS as `0x${string}`;
export const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS as `0x${string}`;
export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;

export const ORDER_BOOK_ABI = orderBookAbi as Abi;
export const AMM_ABI = ammAbi as Abi;
export const VAULT_ABI = vaultAbi as Abi;

const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? arbitrumSepolia.id);

export const configuredChain: typeof arbitrumSepolia | typeof hardhat =
  envChainId === hardhat.id ? hardhat : arbitrumSepolia;

const rpcUrl =
  configuredChain.id === hardhat.id
    ? (process.env.NEXT_PUBLIC_LOCAL_RPC ?? "http://127.0.0.1:8545")
    : (process.env.NEXT_PUBLIC_RPC_URL ?? arbitrumSepolia.rpcUrls.default.http[0]);

export function isOrderBookDeployed(): boolean {
  return Boolean(ORDER_BOOK_ADDRESS);
}

export const publicClient = createPublicClient({
  chain: configuredChain,
  transport: http(rpcUrl),
});
