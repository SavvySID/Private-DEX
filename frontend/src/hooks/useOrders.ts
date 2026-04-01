"use client";

import { useAccount, usePublicClient, useReadContract, useReadContracts, useWalletClient } from "wagmi";
import { useCallback, useMemo } from "react";
import { hexToBigInt, type Address, type Hex } from "viem";
import {
  ORDER_BOOK_ABI,
  ORDER_BOOK_ADDRESS,
  configuredChain,
} from "@/lib/contracts";
import { initCofhe, unsealCt } from "@/lib/cofhe";
import { getCofheEnvironment } from "@/lib/cofheEnv";

export type OnChainOrder = {
  id: bigint;
  tokenIn: Address;
  tokenOut: Address;
  expiry: bigint;
  filled: boolean;
  cancelled: boolean;
  amountInHandle: Hex;
};

export function useOrders() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: configuredChain.id });
  const { data: walletClient } = useWalletClient({ chainId: configuredChain.id });

  const { data: orderCount, refetch: refetchCount, ...countQ } = useReadContract({
    address: ORDER_BOOK_ADDRESS,
    abi: ORDER_BOOK_ABI,
    functionName: "orderCount",
    chainId: configuredChain.id,
    query: { enabled: ORDER_BOOK_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const count = orderCount != null ? Number(orderCount) : 0;

  const orderQueries = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      address: ORDER_BOOK_ADDRESS,
      abi: ORDER_BOOK_ABI,
      functionName: "orders" as const,
      args: [BigInt(i)] as const,
      chainId: configuredChain.id,
    }));
  }, [count]);

  const { data: orderResults, refetch: refetchOrders, isLoading, isFetching } = useReadContracts({
    contracts: orderQueries,
    query: {
      enabled: count > 0 && ORDER_BOOK_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  const orders: OnChainOrder[] = useMemo(() => {
    if (!orderResults || !address) return [];
    const mine: OnChainOrder[] = [];
    orderResults.forEach((res, i) => {
      if (res.status !== "success" || !res.result) return;
      const r = res.result as readonly [Address, Address, Address, Hex, Hex, bigint, boolean, boolean];
      const trader = r[0];
      if (trader.toLowerCase() !== address.toLowerCase()) return;
      mine.push({
        id: BigInt(i),
        tokenIn: r[1],
        tokenOut: r[2],
        amountInHandle: r[3],
        expiry: r[5],
        filled: r[6],
        cancelled: r[7],
      });
    });
    return mine.reverse();
  }, [orderResults, address]);

  const refetch = useCallback(async () => {
    await refetchCount();
    await refetchOrders();
  }, [refetchCount, refetchOrders]);

  const revealOrderAmount = useCallback(
    async (orderId: bigint) => {
      if (!publicClient || !walletClient) {
        throw new Error("Wallet not ready");
      }
      await initCofhe(publicClient, walletClient, getCofheEnvironment());
      const r = await publicClient.readContract({
        address: ORDER_BOOK_ADDRESS,
        abi: ORDER_BOOK_ABI,
        functionName: "orders",
        args: [orderId],
      });
      const row = r as readonly [Address, Address, Address, Hex, Hex, bigint, boolean, boolean];
      const amountIn = row[3];
      const ctHash = hexToBigInt(amountIn);
      return unsealCt(ctHash);
    },
    [publicClient, walletClient],
  );

  return {
    orders,
    isLoading: isLoading || isFetching || countQ.isLoading,
    refetch,
    revealOrderAmount,
    activeOrderCount: orders.filter((o) => !o.filled && !o.cancelled && o.expiry > BigInt(Math.floor(Date.now() / 1000))).length,
  };
}
