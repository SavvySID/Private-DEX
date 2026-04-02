"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { AMM_ABI, AMM_ADDRESS, configuredChain } from "@/lib/contracts";

const ammEnabled = Boolean(AMM_ADDRESS);

export function usePoolStats() {
  const { data, isLoading, isFetching } = useReadContracts({
    contracts: [
      {
        address: AMM_ADDRESS,
        abi: AMM_ABI,
        functionName: "totalMatchedOrders",
        chainId: configuredChain.id,
      },
      {
        address: AMM_ADDRESS,
        abi: AMM_ABI,
        functionName: "estimatedMevSaved",
        chainId: configuredChain.id,
      },
    ],
    query: {
      enabled: ammEnabled,
      refetchInterval: 10_000,
    },
  });

  const totalMatchedOrders = useMemo(() => {
    const r = data?.[0];
    if (r?.status !== "success" || r.result == null) return 0;
    return Number(r.result);
  }, [data]);

  const estimatedMevSaved = useMemo(() => {
    const r = data?.[1];
    if (r?.status !== "success" || r.result == null) return 0;
    return Number(r.result);
  }, [data]);

  const mevSavedDisplay = useMemo(() => {
    const usdApprox = estimatedMevSaved * 100;
    const formatted = usdApprox.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `~$${formatted} saved`;
  }, [estimatedMevSaved]);

  return {
    totalMatchedOrders,
    estimatedMevSaved,
    isLoading: isLoading || isFetching,
    mevSavedDisplay,
  };
}
