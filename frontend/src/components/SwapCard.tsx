"use client";

import { useState, useMemo } from "react";
import { ArrowDownUp, Lock, ShieldCheck, Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hardhat } from "viem/chains";
import { configuredChain, isOrderBookDeployed } from "@/lib/contracts";
import {
  USDC_ARBITRUM_SEPOLIA,
  WETH_ARBITRUM_SEPOLIA,
  MOCK_USDC_LOCAL,
  MOCK_WETH_LOCAL,
} from "@/lib/tokens";
import {
  USDC_PER_ETH,
  applyMinOutSlippage,
  ethToUsdcFixed6,
  formatFixed6,
  humanToFixed6,
  isEthUsdcPair,
  usdcToEthFixed6,
} from "@/lib/swapMath";
import { usePrivateSwap } from "@/hooks/usePrivateSwap";

const tokens = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠" },
  { symbol: "USDC", name: "USD Coin", icon: "◉" },
  { symbol: "WBTC", name: "Wrapped BTC", icon: "₿" },
  { symbol: "DAI", name: "Dai", icon: "◈" },
];

export default function SwapCard() {
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const { status, executeSwap, reset, lastError } = usePrivateSwap();

  const { tokenIn, tokenOut, payEth } = useMemo(() => {
    const local = configuredChain.id === hardhat.id;
    const weth = local ? MOCK_WETH_LOCAL : WETH_ARBITRUM_SEPOLIA;
    const usdc = local ? MOCK_USDC_LOCAL : USDC_ARBITRUM_SEPOLIA;
    const isEthToStable = fromToken.symbol === "ETH" && toToken.symbol === "USDC";
    if (isEthToStable) {
      return { tokenIn: weth, tokenOut: usdc, payEth: true };
    }
    if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
      return { tokenIn: usdc, tokenOut: weth, payEth: false };
    }
    return { tokenIn: weth, tokenOut: usdc, payEth: true };
  }, [fromToken.symbol, toToken.symbol]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const { receiveEstimate, receiveFixed6, rateLabel } = useMemo(() => {
    if (!fromAmount.trim() || Number.isNaN(Number.parseFloat(fromAmount))) {
      return { receiveEstimate: "", receiveFixed6: null as bigint | null, rateLabel: "" };
    }

    const pair = isEthUsdcPair(fromToken.symbol, toToken.symbol);
    try {
      const inFixed6 = humanToFixed6(fromAmount);
      let outFixed6: bigint;
      let label: string;

      if (pair && payEth) {
        outFixed6 = ethToUsdcFixed6(inFixed6);
        label = `1 ETH ≈ ${USDC_PER_ETH.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
      } else if (pair && !payEth) {
        outFixed6 = usdcToEthFixed6(inFixed6);
        label = `1 USDC ≈ ${(1 / USDC_PER_ETH).toFixed(8)} ETH`;
      } else {
        outFixed6 = ethToUsdcFixed6(inFixed6);
        label = `1 ETH ≈ ${USDC_PER_ETH.toLocaleString()} USDC (estimate)`;
      }

      const outFrac = toToken.symbol === "ETH" ? 8 : 6;
      return {
        receiveEstimate: formatFixed6(outFixed6, outFrac),
        receiveFixed6: outFixed6,
        rateLabel: label,
      };
    } catch {
      return { receiveEstimate: "", receiveFixed6: null, rateLabel: "" };
    }
  }, [fromAmount, fromToken.symbol, toToken.symbol, payEth]);

  const handleEncryptAndSwap = async () => {
    setConvertError(null);
    if (!fromAmount.trim() || receiveFixed6 === null) return;
    try {
      const amountInFixed6 = humanToFixed6(fromAmount);
      const minOutFixed6 = applyMinOutSlippage(receiveFixed6);
      await executeSwap({
        tokenIn,
        tokenOut,
        amountInFixed6,
        minOutFixed6,
      });
    } catch (e) {
      console.error(e);
      setConvertError(e instanceof Error ? e.message : "Invalid amount");
    }
  };

  const label =
    status === "idle"
      ? "Encrypt & Swap"
      : status === "encrypting"
        ? "Encrypting via CoFHE…"
        : status === "submitting"
          ? "Submitting…"
          : status === "done"
            ? "Order Placed"
            : "Try Again";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-card rounded-2xl p-1">
        <div className="rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold text-foreground">Encrypted Swap</h2>
            <div className="encrypted-badge">
              <ShieldCheck className="w-3 h-3" />
              FHE Protected
            </div>
          </div>

          {!isOrderBookDeployed() && (
            <div className="mx-4 mb-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Deploy contracts and set{" "}
              <span className="font-mono">NEXT_PUBLIC_ORDER_BOOK_ADDRESS</span> in{" "}
              <span className="font-mono">frontend/.env.local</span>, then restart the dev server.
            </div>
          )}

          {configuredChain.id === hardhat.id && isOrderBookDeployed() && (
            <div className="mx-4 mb-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              Local chain: cofhejs uses MOCK encryption. <strong className="text-foreground">submitOrder</strong> only
              succeeds if your node verifies CoFHE inputs (use Arbitrum Sepolia for a full end-to-end swap).
            </div>
          )}

          <div className="px-4 pb-1">
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">You pay</span>
                <span className="text-xs text-muted-foreground">Encrypted payload · 6dp uint64</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => {
                    reset();
                    setConvertError(null);
                    setFromAmount(e.target.value);
                  }}
                  className="flex-1 bg-transparent text-2xl font-mono font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
                />
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors shrink-0 min-w-[120px]"
                >
                  <span className="text-base leading-none">{fromToken.icon}</span>
                  <span className="font-semibold text-sm text-foreground">{fromToken.symbol}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button
              type="button"
              onClick={handleSwapTokens}
              className="w-9 h-9 rounded-xl bg-card border-4 border-background flex items-center justify-center hover:bg-secondary transition-colors group"
            >
              <ArrowDownUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          <div className="px-4 pt-1">
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">You receive (est.)</span>
                <span className="text-xs text-muted-foreground">min 98% of estimate</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="0.0"
                  readOnly
                  value={receiveEstimate}
                  className="flex-1 bg-transparent text-2xl font-mono font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
                />
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors shrink-0 min-w-[120px]"
                >
                  <span className="text-base leading-none">{toToken.icon}</span>
                  <span className="font-semibold text-sm text-foreground">{toToken.symbol}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {fromAmount && rateLabel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="px-4 pt-3"
            >
              <div className="rounded-xl bg-secondary/50 p-3 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Rate</span>
                  <span className="font-mono text-foreground">{rateLabel}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Encryption</span>
                  <span className="text-primary font-mono">cofhejs · euint64</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>MEV Protection</span>
                  <span className="text-success font-mono">Active</span>
                </div>
              </div>
            </motion.div>
          )}

          {(convertError || lastError) && (
            <p className="px-4 pt-2 text-xs text-destructive font-mono">
              {convertError ?? lastError}
            </p>
          )}

          <div className="p-4">
            <button
              type="button"
              onClick={handleEncryptAndSwap}
              disabled={
                !isOrderBookDeployed() ||
                !fromAmount.trim() ||
                receiveFixed6 === null ||
                status === "encrypting" ||
                status === "submitting"
              }
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait">
                {status === "encrypting" || status === "submitting" ? (
                  <motion.span
                    key="busy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 animate-pulse-glow" />
                    {label}
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {label}
                    {status === "done" ? " ✓" : ""}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
