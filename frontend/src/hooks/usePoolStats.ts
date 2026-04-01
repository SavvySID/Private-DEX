"use client";

import { useReadContract } from "wagmi";
import { AMM_ABI, AMM_ADDRESS, configuredChain } from "@/lib/contracts";

export function usePoolStats() {
  const q1 = useReadContract({
    address: AMM_ADDRESS,
    abi: AMM_ABI,
    functionName: "totalMatchedOrders",
    chainId: configuredChain.id,
    query: {
      enabled: AMM_ADDRESS !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10_000,
    },
  });
  const q2 = useReadContract({
    address: AMM_ADDRESS,
    abi: AMM_ABI,
    functionName: "estimatedMevSaved",
    chainId: configuredChain.id,
    query: {
      enabled: AMM_ADDRESS !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10_000,
    },
  });

  const totalMatchedOrders = q1.data != null ? Number(q1.data) : 0;
  const estimatedMevSaved = q2.data != null ? Number(q2.data) : 0;
  const mevSavedDisplay = `~$${(estimatedMevSaved * 15).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const isLoading = q1.isLoading || q2.isLoading || q1.isFetching || q2.isFetching;

  return { totalMatchedOrders, estimatedMevSaved, mevSavedDisplay, isLoading };
}
