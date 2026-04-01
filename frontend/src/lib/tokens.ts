import type { Address } from "viem";

/** Arbitrum Sepolia canonical-ish test tokens (replace with your deployed mocks if needed). */
export const WETH_ARBITRUM_SEPOLIA =
  "0x980B62Da83Ff3D4597F18EB99b9044B198BF1E00" as Address;

export const USDC_ARBITRUM_SEPOLIA =
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address;

/** Hardhat / Anvil default — deploy mock ERC20s locally and paste here for demos. */
export const MOCK_WETH_LOCAL = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address;
export const MOCK_USDC_LOCAL = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as Address;
