"use client";

import { useEffect, useState } from "react";
import { Lock, Eye, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { useOrders } from "@/hooks/useOrders";

type RowStatus = "matched" | "pending" | "cancelled" | "expired";

function classify(expiry: bigint, filled: boolean, cancelled: boolean): RowStatus {
  if (cancelled) return "cancelled";
  if (filled) return "matched";
  if (expiry <= BigInt(Math.floor(Date.now() / 1000))) return "expired";
  return "pending";
}

function useNow(tick = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), tick);
    return () => clearInterval(t);
  }, [tick]);
  return now;
}

export default function OrderTable() {
  const { orders, isLoading, revealOrderAmount } = useOrders();
  const now = useNow();
  const [revealLoading, setRevealLoading] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const onReveal = async (orderId: bigint) => {
    const key = orderId.toString();
    setRevealLoading(Number(orderId));
    try {
      const raw = await revealOrderAmount(orderId);
      setRevealed((p) => ({ ...p, [key]: formatUnits(raw, 6) }));
    } catch (e) {
      console.error(e);
    } finally {
      setRevealLoading(null);
    }
  };

  const statusChip: Record<
    RowStatus,
    { icon: typeof CheckCircle; label: string; className: string }
  > = {
    matched: { icon: CheckCircle, label: "Matched", className: "text-success" },
    pending: { icon: Clock, label: "Pending", className: "text-warning" },
    cancelled: { icon: XCircle, label: "Cancelled", className: "text-destructive" },
    expired: { icon: Clock, label: "Expired", className: "text-muted-foreground" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">My Encrypted Orders</h2>
        <div className="encrypted-badge">
          <Lock className="w-3 h-3" />
          Amounts Hidden
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Pair</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Expiry</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Loading on-chain orders…
                </td>
              </tr>
            )}
            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No orders yet. Make your first private swap.
                </td>
              </tr>
            )}
            {!isLoading &&
              orders.map((order, i) => {
                const rowStatus = classify(order.expiry, order.filled, order.cancelled);
                const status = statusChip[rowStatus];
                const StatusIcon = status.icon;
                const exp = Number(order.expiry);
                const left = Math.max(0, exp - now);
                const pair = `${order.tokenIn.slice(0, 6)}… / ${order.tokenOut.slice(0, 6)}…`;
                const key = order.id.toString();
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-sm text-foreground font-mono">{pair}</td>
                    <td className="px-6 py-4">
                      {revealed[key] ? (
                        <span className="text-xs font-mono text-foreground">{revealed[key]}</span>
                      ) : (
                        <span className="encrypted-badge text-[10px]">🔒 Hidden</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {rowStatus === "expired" || rowStatus === "matched" || rowStatus === "cancelled"
                        ? "—"
                        : `${Math.floor(left / 60)}m ${left % 60}s`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {rowStatus === "matched" && (
                        <button
                          type="button"
                          onClick={() => onReveal(order.id)}
                          disabled={revealLoading === Number(order.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        >
                          {revealLoading === Number(order.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Reveal Amount
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
