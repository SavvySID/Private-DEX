import { createPublicClient, http, type Abi } from "viem";
import { arbitrumSepolia, hardhat } from "viem/chains";
import orderBookAbi from "./abis/PrivateOrderBook.json";
import ammAbi from "./abis/PrivateAMM.json";
import vaultAbi from "./abis/PrivateVault.json";
import { ZERO_ADDRESS, toAddressOrZero } from "./address";

export const ORDER_BOOK_ADDRESS = toAddressOrZero(
  process.env.NEXT_PUBLIC_ORDER_BOOK_ADDRESS,
  "NEXT_PUBLIC_ORDER_BOOK_ADDRESS",
);
export const AMM_ADDRESS = toAddressOrZero(
  process.env.NEXT_PUBLIC_AMM_ADDRESS,
  "NEXT_PUBLIC_AMM_ADDRESS",
);
export const VAULT_ADDRESS = toAddressOrZero(
  process.env.NEXT_PUBLIC_VAULT_ADDRESS,
  "NEXT_PUBLIC_VAULT_ADDRESS",
);

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
  return ORDER_BOOK_ADDRESS !== ZERO_ADDRESS;
}

export const publicClient = createPublicClient({
  chain: configuredChain,
  transport: http(rpcUrl),
});
