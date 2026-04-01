"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { getWalletClient, switchChain } from "wagmi/actions";
import type { Address } from "viem";
import {
  ORDER_BOOK_ABI,
  ORDER_BOOK_ADDRESS,
  configuredChain,
  isOrderBookDeployed,
} from "@/lib/contracts";
import { encryptSwapAmounts, initCofhe, mapCoFheInput } from "@/lib/cofhe";
import { getCofheEnvironment } from "@/lib/cofheEnv";
import { UINT64_MAX } from "@/lib/swapMath";
import { formatTransactionError } from "@/lib/txErrors";
import { wagmiConfig } from "@/wagmi";

export type PrivateSwapStatus = "idle" | "encrypting" | "submitting" | "done" | "error";

export function usePrivateSwap() {
  const [status, setStatus] = useState<PrivateSwapStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: configuredChain.id });

  const executeSwap = useCallback(
    async ({
      tokenIn,
      tokenOut,
      amountInFixed6,
      minOutFixed6,
    }: {
      tokenIn: Address;
      tokenOut: Address;
      amountInFixed6: bigint;
      minOutFixed6: bigint;
    }) => {
      setLastError(null);

      if (!isOrderBookDeployed()) {
        setStatus("error");
        setLastError(
          "Order book not configured. Run deploy script and set NEXT_PUBLIC_ORDER_BOOK_ADDRESS in frontend/.env.local.",
        );
        return;
      }

      if (!isConnected || !address) {
        setStatus("error");
        setLastError("Connect your wallet first.");
        return;
      }

      if (!publicClient) {
        setStatus("error");
        setLastError("RPC client unavailable. Check NEXT_PUBLIC_RPC_URL / network.");
        return;
      }

      if (amountInFixed6 <= BigInt(0)) {
        setStatus("error");
        setLastError("Enter an amount greater than zero.");
        return;
      }

      if (minOutFixed6 <= BigInt(0)) {
        setStatus("error");
        setLastError("Estimated output is too small. Increase the amount you pay.");
        return;
      }

      if (amountInFixed6 > UINT64_MAX || minOutFixed6 > UINT64_MAX) {
        setStatus("error");
        setLastError("Encrypted amounts must fit uint64.");
        return;
      }

      try {
        if (chainId !== configuredChain.id) {
          try {
            await switchChain(wagmiConfig, { chainId: configuredChain.id });
          } catch (switchErr) {
            setStatus("error");
            setLastError(
              `Switch to ${configuredChain.name} (chain ${configuredChain.id}) in your wallet, then try again. ${formatTransactionError(switchErr)}`,
            );
            return;
          }
        }

        const walletClient = await getWalletClient(wagmiConfig, {
          chainId: configuredChain.id,
        });

        if (!walletClient) {
          setStatus("error");
          setLastError(
            `Switch to ${configuredChain.name} (chain ${configuredChain.id}) in your wallet, then try again.`,
          );
          return;
        }

        const cofheEnv = getCofheEnvironment();

        setStatus("encrypting");
        await initCofhe(publicClient, walletClient, cofheEnv);

        const { encAmountIn, encMinOut } = await encryptSwapAmounts(amountInFixed6, minOutFixed6);

        const encIn = mapCoFheInput(encAmountIn);
        const encOut = mapCoFheInput(encMinOut);
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

        setStatus("submitting");

        const { request } = await publicClient.simulateContract({
          address: ORDER_BOOK_ADDRESS,
          abi: ORDER_BOOK_ABI,
          functionName: "submitOrder",
          args: [tokenIn, tokenOut, encIn, encOut, expiry],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        setStatus("done");
      } catch (e) {
        console.error(e);
        setStatus("error");
        setLastError(formatTransactionError(e));
      }
    },
    [address, chainId, isConnected, publicClient],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setLastError(null);
  }, []);

  return { status, executeSwap, reset, lastError };
}
