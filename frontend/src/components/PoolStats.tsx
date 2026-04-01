"use client";

import { Shield, Activity, Lock, Layers, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoolStats } from "@/hooks/usePoolStats";

const mockPools = [
  { pair: "ETH / USDC", tvl: "$8.4M", volume24h: "$1.1M", apy: "4.2%", utilization: 72 },
  { pair: "WBTC / ETH", tvl: "$6.1M", volume24h: "$890K", apy: "3.8%", utilization: 58 },
  { pair: "DAI / USDC", tvl: "$5.2M", volume24h: "$620K", apy: "2.1%", utilization: 45 },
  { pair: "ETH / DAI", tvl: "$3.1M", volume24h: "$410K", apy: "3.5%", utilization: 34 },
  { pair: "USDC / WBTC", tvl: "$2.0M", volume24h: "$190K", apy: "5.1%", utilization: 28 },
];

export default function PoolStats({ activeOrderCount = 0 }: { activeOrderCount?: number }) {
  const { totalMatchedOrders, estimatedMevSaved, mevSavedDisplay, isLoading } = usePoolStats();

  const stats = [
    { label: "Total Matched Orders", value: String(totalMatchedOrders), icon: Activity, pulse: false },
    {
      label: "MEV Saved (est.)",
      value: mevSavedDisplay,
      sub: `${estimatedMevSaved} matcher ticks`,
      icon: Shield,
      pulse: true,
    },
    { label: "Active Orders (yours)", value: String(activeOrderCount), icon: Lock, pulse: false },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-5"
            >
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center ${stat.pulse ? "animate-pulse-glow" : ""}`}
                    >
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
                  {"sub" in stat && stat.sub && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{stat.sub}</p>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Dark Pools</h2>
          </div>
          <div className="encrypted-badge">
            <Shield className="w-3 h-3" />
            All TVL Encrypted
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Pool</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">TVL</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">24h Volume</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">APY</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {mockPools.map((pool, i) => (
                <motion.tr
                  key={pool.pair}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-semibold text-sm text-foreground">{pool.pair}</td>
                  <td className="px-6 py-4 font-mono text-sm text-foreground">{pool.tvl}</td>
                  <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{pool.volume24h}</td>
                  <td className="px-6 py-4 font-mono text-sm text-success">{pool.apy}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pool.utilization}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{pool.utilization}%</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="flex justify-center">
        <span className="encrypted-badge">
          <Layers className="w-3 h-3" />
          Powered by Fhenix CoFHE 🔒
        </span>
      </div>
    </div>
  );
}
