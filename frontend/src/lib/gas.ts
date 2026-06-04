import type { PublicClient } from "viem";

export type BufferedFees = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

/**
 * Compute EIP-1559 fees with a safety buffer.
 *
 * On chains like Arbitrum Sepolia the base fee drifts between the moment viem
 * estimates fees and the moment the node validates the tx, which yields
 * "max fee per gas less than block base fee" reverts. We read the latest block's
 * base fee and over-provision `maxFeePerGas` (default 3× base fee + priority) so a
 * small upward drift can't reject the transaction. The user is only ever charged
 * `baseFee + priorityFee`, so the buffer is a ceiling, not a cost.
 */
export async function getBufferedFees(
  publicClient: PublicClient,
  baseFeeMultiplier = BigInt(3),
): Promise<BufferedFees | undefined> {
  const PRIORITY_FALLBACK = BigInt(1_000_000); // 0.001 gwei
  try {
    const block = await publicClient.getBlock({ blockTag: "latest" });
    const baseFee = block.baseFeePerGas;
    // Pre-1559 / legacy chains: let the wallet handle pricing.
    if (baseFee == null) return undefined;

    let maxPriorityFeePerGas: bigint;
    try {
      maxPriorityFeePerGas = await publicClient.estimateMaxPriorityFeePerGas();
    } catch {
      maxPriorityFeePerGas = PRIORITY_FALLBACK;
    }

    // Ensure a non-zero priority so the tx is includable even when the node reports 0.
    if (maxPriorityFeePerGas === BigInt(0)) maxPriorityFeePerGas = PRIORITY_FALLBACK;

    const maxFeePerGas = baseFee * baseFeeMultiplier + maxPriorityFeePerGas;
    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    // If anything fails, fall back to wallet/viem defaults by returning undefined.
    return undefined;
  }
}
