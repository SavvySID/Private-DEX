"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Eye, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatUnits, type Address } from "viem";
import { useOrders } from "@/hooks/useOrders";
import {
  MOCK_USDC_LOCAL,
  MOCK_WETH_LOCAL,
  USDC_ARBITRUM_SEPOLIA,
  WETH_ARBITRUM_SEPOLIA,
} from "@/lib/tokens";

type RowStatus = "matched" | "pending" | "cancelled" | "expired";

function classify(expiry: bigint, filled: boolean, cancelled: boolean, nowSec: number): RowStatus {
  if (cancelled) return "cancelled";
  if (filled) return "matched";
  if (expiry <= BigInt(nowSec)) return "expired";
  return "pending";
}

const TOKEN_SYMBOL: Record<string, string> = {
  [WETH_ARBITRUM_SEPOLIA.toLowerCase()]: "WETH",
  [USDC_ARBITRUM_SEPOLIA.toLowerCase()]: "USDC",
  [MOCK_WETH_LOCAL.toLowerCase()]: "WETH",
  [MOCK_USDC_LOCAL.toLowerCase()]: "USDC",
};

function tokenSymbol(addr: Address): string {
  return TOKEN_SYMBOL[addr.toLowerCase()] ?? `${addr.slice(0, 6)}…`;
}

function formatAmountFixed6(raw: bigint): string {
  const s = formatUnits(raw, 6);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "") || "0";
}

function formatExpiryLabel(rowStatus: RowStatus, expiryTs: number, now: number): string {
  if (rowStatus === "pending") {
    const left = expiryTs - now;
    if (left <= 0) return "Expired";
    const totalMin = Math.ceil(left / 60);
    if (totalMin >= 60) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return m ? `Expires in ${h}h ${m} min` : `Expires in ${h}h`;
    }
    return `Expires in ${totalMin} min`;
  }
  if (rowStatus === "expired") return "Expired";
  return "—";
}

function useNow(tick = 30_000) {
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
  const [revealLoadingId, setRevealLoadingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const statusChip = useMemo(
    () =>
      ({
        matched: {
          icon: CheckCircle,
          label: "Matched",
          className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/35",
        },
        pending: {
          icon: Clock,
          label: "Pending",
          className: "bg-amber-500/15 text-amber-400 border-amber-500/35",
        },
        cancelled: {
          icon: XCircle,
          label: "Cancelled",
          className: "bg-red-500/15 text-red-400 border-red-500/35",
        },
        expired: {
          icon: Clock,
          label: "Expired",
          className: "bg-muted/80 text-muted-foreground border-border",
        },
      }) satisfies Record<
        RowStatus,
        { icon: typeof CheckCircle; label: string; className: string }
      >,
    [],
  );

  const onReveal = async (orderId: bigint, amountSymbol: string) => {
    const key = orderId.toString();
    setRevealLoadingId(key);
    try {
      const raw = await revealOrderAmount(orderId);
      const formatted = `${formatAmountFixed6(raw)} ${amountSymbol}`;
      setRevealed((p) => ({ ...p, [key]: formatted }));
    } catch (e) {
      console.error(e);
    } finally {
      setRevealLoadingId(null);
    }
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
                const rowStatus = classify(order.expiry, order.filled, order.cancelled, now);
                const chip = statusChip[rowStatus];
                const StatusIcon = chip.icon;
                const exp = Number(order.expiry);
                const pair = `${tokenSymbol(order.tokenIn)} → ${tokenSymbol(order.tokenOut)}`;
                const key = order.id.toString();
                const revealedText = revealed[key];
                const isRevealing = revealLoadingId === key;

                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-sm text-foreground">{pair}</td>
                    <td className="px-6 py-4">
                      {!order.filled ? (
                        <span className="inline-flex items-center rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          🔒 Hidden
                        </span>
                      ) : revealedText ? (
                        <span className="text-sm font-mono text-foreground">{revealedText}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                      {formatExpiryLabel(rowStatus, exp, now)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${chip.className}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {chip.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.filled && !revealedText ? (
                        <button
                          type="button"
                          onClick={() => onReveal(order.id, tokenSymbol(order.tokenIn))}
                          disabled={isRevealing}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
                        >
                          {isRevealing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Reveal Amount
                        </button>
                      ) : null}
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
