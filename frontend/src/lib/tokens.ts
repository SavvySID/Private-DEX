import { toAddress } from "./address";

/**
 * Token addresses come from env (written by `npm run deploy:tokens`) when set,
 * otherwise fall back to baked-in defaults. Always normalized via viem so any
 * casing is accepted.
 *
 * NOTE: the fallback WETH below is a placeholder and is NOT a deployed contract
 * on Arbitrum Sepolia — deploy mock tokens with `npm run deploy:tokens` so the
 * vault's ERC20 transfers actually work.
 */
const FALLBACK_WETH = "0x980B62Da83Ff3d4597f18eB99B9044B198BF1e00";
const FALLBACK_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

export const WETH_ARBITRUM_SEPOLIA = toAddress(
  process.env.NEXT_PUBLIC_WETH_ADDRESS || FALLBACK_WETH,
  "NEXT_PUBLIC_WETH_ADDRESS",
);

export const USDC_ARBITRUM_SEPOLIA = toAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS || FALLBACK_USDC,
  "NEXT_PUBLIC_USDC_ADDRESS",
);

/** Hardhat / Anvil default — deploy mock ERC20s locally (`npm run deploy:tokens:local`). */
export const MOCK_WETH_LOCAL = toAddress(
  process.env.NEXT_PUBLIC_WETH_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "NEXT_PUBLIC_WETH_ADDRESS",
);
export const MOCK_USDC_LOCAL = toAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "NEXT_PUBLIC_USDC_ADDRESS",
);
