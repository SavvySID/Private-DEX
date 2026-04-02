import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arbitrumSepolia, hardhat } from "wagmi/chains";
import type { Config } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

const arbitrumRpc =
  process.env.NEXT_PUBLIC_RPC_URL ?? arbitrumSepolia.rpcUrls.default.http[0];
const hardhatRpc = process.env.NEXT_PUBLIC_LOCAL_RPC ?? "http://127.0.0.1:8545";

const chains = [arbitrumSepolia, hardhat] as const;

const transports = {
  [arbitrumSepolia.id]: http(arbitrumRpc),
  [hardhat.id]: http(hardhatRpc),
} as const;

/**
 * Without a real WalletConnect Cloud project ID, RainbowKit’s default stack calls Reown/AppKit
 * and every request uses the placeholder id → 403 + allowlist noise. Browser extension wallets
 * work with the injected connector only; set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID when you need QR / mobile WC.
 */
export const wagmiConfig: Config = projectId
  ? getDefaultConfig({
      appName: "PrivateDEX",
      projectId,
      chains,
      transports,
      ssr: true,
    })
  : createConfig({
      chains,
      transports,
      connectors: [injected()],
      ssr: true,
    });
