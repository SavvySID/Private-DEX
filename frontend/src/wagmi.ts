import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia, hardhat } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = getDefaultConfig({
  appName: "PrivateDEX",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [arbitrumSepolia, hardhat],
  ssr: true,
});
