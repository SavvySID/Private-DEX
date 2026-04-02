"use client";

import { useCallback, useState } from "react";
import type { Address } from "viem";
import { BaseError } from "viem";
import { usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { ORDER_BOOK_ABI, ORDER_BOOK_ADDRESS, configuredChain } from "@/lib/contracts";
import { encryptSwapAmounts, initCofhe, mapCoFheInput } from "@/lib/cofhe";
import { getCofheEnvironment } from "@/lib/cofheEnv";
import { humanToFixed6 } from "@/lib/swapMath";

export type PrivateSwapStatus = "idle" | "encrypting" | "submitting" | "done" | "error";

function formatSwapError(error: unknown): string {
  if (error instanceof BaseError) {
    const parts = [error.shortMessage, error.details, error.message].filter(
      (x, i, a) => Boolean(x) && a.indexOf(x) === i,
    );
    return parts.join(" — ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

type UsePrivateSwapParams = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  minOutFixed6: bigint;
};

export function usePrivateSwap({ tokenIn, tokenOut, amountIn, minOutFixed6 }: UsePrivateSwapParams) {
  const [status, setStatus] = useState<PrivateSwapStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: configuredChain.id });
  const { data: walletClient } = useWalletClient({ chainId: configuredChain.id });
  const { writeContractAsync } = useWriteContract();

  const reset = useCallback(() => {
    setStatus("idle");
    setLastError(null);
  }, []);

  const executeSwap = useCallback(async () => {
    setLastError(null);
    try {
      if (!publicClient || !walletClient) {
        const msg = !walletClient
          ? "Connect your wallet and ensure it is on the correct network."
          : "RPC client is not ready.";
        setLastError(msg);
        setStatus("error");
        return;
      }

      setStatus("encrypting");

      try {
        const env = getCofheEnvironment();
        const isLocalHardhat = configuredChain.id === 31337;
        const skipPermit =
          isLocalHardhat || env === "MOCK" || env === "LOCAL";
        await initCofhe(publicClient, walletClient, env, {
          generatePermit: !skipPermit,
          ignoreTfheErrors: isLocalHardhat,
        });
      } catch (e) {
        console.error(e);
        setLastError(`CoFHE setup: ${formatSwapError(e)}`);
        setStatus("error");
        return;
      }

      let encAmountIn: Awaited<ReturnType<typeof encryptSwapAmounts>>["encAmountIn"];
      let encMinOut: Awaited<ReturnType<typeof encryptSwapAmounts>>["encMinOut"];
      try {
        const amountInFixed6 = humanToFixed6(amountIn);
        const enc = await encryptSwapAmounts(amountInFixed6, minOutFixed6);
        encAmountIn = enc.encAmountIn;
        encMinOut = enc.encMinOut;
      } catch (e) {
        console.error(e);
        setLastError(
          `Encryption failed (on Hardhat, approve the mock-verifier transaction in your wallet if prompted): ${formatSwapError(e)}`,
        );
        setStatus("error");
        return;
      }

      setStatus("submitting");

      try {
        await writeContractAsync({
          address: ORDER_BOOK_ADDRESS,
          abi: ORDER_BOOK_ABI,
          functionName: "submitOrder",
          args: [
            tokenIn,
            tokenOut,
            mapCoFheInput(encAmountIn),
            mapCoFheInput(encMinOut),
            BigInt(Math.floor(Date.now() / 1000) + 3600),
          ],
          chainId: configuredChain.id,
        });
      } catch (e) {
        console.error(e);
        setLastError(`submitOrder failed: ${formatSwapError(e)}`);
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch (error) {
      console.error(error);
      setLastError(formatSwapError(error));
      setStatus("error");
    }
  }, [amountIn, minOutFixed6, publicClient, tokenIn, tokenOut, walletClient, writeContractAsync]);

  return { status, executeSwap, reset, lastError };
}
