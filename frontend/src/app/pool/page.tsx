"use client";

import PoolStats from "@/components/PoolStats";
import PrivateBalance from "@/components/PrivateBalance";
import { useOrders } from "@/hooks/useOrders";

export default function PoolPage() {
  const { activeOrderCount } = useOrders();

  return (
    <div className="container pt-24 pb-16 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pool Statistics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live matcher counters from <span className="font-mono text-primary">PrivateAMM</span> — dark pool
          table reflects illustrative liquidity tiers.
        </p>
      </div>
      <PoolStats activeOrderCount={activeOrderCount} />
      <div className="mt-8 max-w-lg mx-auto">
        <PrivateBalance />
      </div>
    </div>
  );
}
