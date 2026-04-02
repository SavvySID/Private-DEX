"use client";

import { useAccount, usePublicClient, useReadContract, useReadContracts, useWalletClient } from "wagmi";
import { useCallback, useMemo } from "react";
import type { Address, Hex } from "viem";
import { ORDER_BOOK_ABI, ORDER_BOOK_ADDRESS, configuredChain } from "@/lib/contracts";
import { getCofheEnvironment } from "@/lib/cofheEnv";
import { getPermission, initCofhe, unsealValue } from "@/lib/cofhe";

export type OnChainOrder = {
  id: bigint;
  trader: Address;
  tokenIn: Address;
  tokenOut: Address;
  expiry: bigint;
  filled: boolean;
  cancelled: boolean;
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
      functionName: "getOrder" as const,
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
      const r = res.result as readonly [Address, Address, Address, bigint, boolean, boolean];
      const trader = r[0];
      if (trader.toLowerCase() !== address.toLowerCase()) return;
      mine.push({
        id: BigInt(i),
        trader,
        tokenIn: r[1],
        tokenOut: r[2],
        expiry: r[3],
        filled: r[4],
        cancelled: r[5],
      });
    });
    return mine.reverse();
  }, [orderResults, address]);

  const refetch = useCallback(async () => {
    await refetchCount();
    await refetchOrders();
  }, [refetchCount, refetchOrders]);

  const revealOrderAmount = useCallback(
    async (orderId: number | bigint) => {
      if (!publicClient || !walletClient) {
        throw new Error("Wallet not ready");
      }

      await initCofhe(publicClient, walletClient, getCofheEnvironment());

      const permission = getPermission();
      if (!permission) {
        throw new Error("Missing CoFHE permission");
      }

      const row = (await publicClient.readContract({
        address: ORDER_BOOK_ADDRESS,
        abi: ORDER_BOOK_ABI,
        functionName: "orders",
        args: [typeof orderId === "bigint" ? orderId : BigInt(orderId)],
      })) as readonly [Address, Address, Address, Hex, Hex, bigint, boolean, boolean];

      const sealedAmount = row[3] as bigint | Hex | string;
      const asStr =
        typeof sealedAmount === "bigint" ? sealedAmount.toString() : String(sealedAmount);
      return unsealValue(asStr);
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
