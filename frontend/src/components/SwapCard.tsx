"use client";

import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { ArrowDownUp, Check, Lock, ShieldCheck, Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isOrderBookDeployed } from "@/lib/contracts";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Short curated list — only assets the demo routes & math support (WETH/USDC under the hood). */
const SWAP_TOKENS = [
  { symbol: "ETH" as const, name: "Ether", icon: "⟠" },
  { symbol: "USDC" as const, name: "USD Coin", icon: "◉" },
];

export type SwapToken = (typeof SWAP_TOKENS)[number];

const isLocalChain = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614) === 31337;

const TokenSelectTrigger = forwardRef<
  HTMLButtonElement,
  { token: SwapToken; className?: string } & ComponentPropsWithoutRef<"button">
>(function TokenSelectTrigger({ token, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted px-2.5 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:bg-muted/90 focus-visible:ring-2 focus-visible:ring-ring sm:h-11 sm:px-3",
        className,
      )}
    >
      <span className="text-base leading-none" aria-hidden>
        {token.icon}
      </span>
      <span className="tabular-nums">{token.symbol}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
});
TokenSelectTrigger.displayName = "TokenSelectTrigger";

export default function SwapCard() {
  const [fromToken, setFromToken] = useState<SwapToken>(SWAP_TOKENS[0]);
  const [toToken, setToToken] = useState<SwapToken>(SWAP_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  const { tokenIn, tokenOut, payEth } = useMemo(() => {
    const local = isLocalChain;
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

  const minOutFixed6 = useMemo(() => {
    if (receiveFixed6 === null) return BigInt(0);
    return applyMinOutSlippage(receiveFixed6);
  }, [receiveFixed6]);

  const { status, executeSwap, reset, lastError } = usePrivateSwap({
    tokenIn,
    tokenOut,
    amountIn: fromAmount || "0",
    minOutFixed6,
  });

  const handleSwapTokens = () => {
    if (status === "done" || status === "error") reset();
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const pickFromToken = (next: SwapToken) => {
    if (next.symbol === toToken.symbol) {
      setToToken(fromToken);
    }
    if (status === "done" || status === "error") reset();
    setFromToken(next);
  };

  const pickToToken = (next: SwapToken) => {
    if (next.symbol === fromToken.symbol) {
      setFromToken(toToken);
    }
    if (status === "done" || status === "error") reset();
    setToToken(next);
  };

  const swapButtonLabel =
    status === "idle"
      ? "Private Swap 🔒"
      : status === "encrypting"
        ? "Encrypting... 🔒"
        : status === "submitting"
          ? "Submitting..."
          : status === "done"
            ? "Order Placed ✅"
            : "Try Again";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="w-full min-w-0 max-w-md mx-auto"
    >
      <div className="glass-card min-w-0 rounded-2xl p-1">
        <div className="rounded-xl min-w-0">
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

          {isLocalChain && isOrderBookDeployed() && (
            <div className="mx-4 mb-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Local 31337:</strong> keep{" "}
                <span className="font-mono text-foreground">npx hardhat node</span> running at your RPC URL (see{" "}
                <span className="font-mono">NEXT_PUBLIC_LOCAL_RPC</span>
                ). Client-side encrypt uses <strong className="text-foreground">Fhenix testnet CoFHE</strong> (needs
                internet). Your contracts still run on Hardhat—confirmation on-chain may fail if inputs don’t match what
                your node expects; use Arbitrum Sepolia for the smoothest path.
              </p>
            </div>
          )}

          <div className="px-4 pb-1">
            <div className="rounded-xl bg-secondary p-3 sm:p-4 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">You pay</span>
                <span
                  className="text-xs text-muted-foreground text-end min-w-0 leading-snug"
                  title="Encrypted payload · 6dp uint64"
                >
                  <span className="sm:hidden">euint64 · 6dp</span>
                  <span className="hidden sm:inline">Encrypted payload · 6dp uint64</span>
                </span>
              </div>
              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => {
                    setConvertError(null);
                    if (status === "done" || status === "error") reset();
                    setFromAmount(e.target.value);
                  }}
                  className="min-w-0 w-full bg-transparent text-xl sm:text-2xl font-mono font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TokenSelectTrigger
                      token={fromToken}
                      className="justify-self-end"
                      aria-label={`Pay with ${fromToken.symbol}`}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 z-[100]">
                    {SWAP_TOKENS.map((t) => (
                      <DropdownMenuItem key={t.symbol} className="gap-2" onClick={() => pickFromToken(t)}>
                        <span aria-hidden>{t.icon}</span>
                        <span className="flex-1 font-medium">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground">{t.name}</span>
                        {fromToken.symbol === t.symbol ? <Check className="h-4 w-4 text-primary" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
            <div className="rounded-xl bg-secondary p-3 sm:p-4 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">You receive (est.)</span>
                <span className="text-xs text-muted-foreground text-end min-w-0">min 98% of estimate</span>
              </div>
              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  readOnly
                  placeholder="0.0"
                  value={receiveEstimate}
                  className="min-w-0 w-full bg-transparent text-xl sm:text-2xl font-mono font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TokenSelectTrigger
                      token={toToken}
                      className="justify-self-end"
                      aria-label={`Receive ${toToken.symbol}`}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 z-[100]">
                    {SWAP_TOKENS.map((t) => (
                      <DropdownMenuItem key={t.symbol} className="gap-2" onClick={() => pickToToken(t)}>
                        <span aria-hidden>{t.icon}</span>
                        <span className="flex-1 font-medium">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground">{t.name}</span>
                        {toToken.symbol === t.symbol ? <Check className="h-4 w-4 text-primary" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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

          {lastError && (
            <div className="mx-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p className="font-semibold text-destructive">Swap failed</p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed break-words">{lastError}</p>
            </div>
          )}

          {convertError && (
            <p className="px-4 pt-2 text-xs text-destructive font-mono">
              {convertError}
            </p>
          )}

          <div className="p-4">
            <button
              type="button"
              onClick={() => {
                setConvertError(null);
                if (!isOrderBookDeployed() || !fromAmount.trim() || receiveFixed6 === null) return;
                if (status === "error" || status === "done") reset();
                void executeSwap();
              }}
              disabled={
                !isOrderBookDeployed() ||
                !fromAmount.trim() ||
                receiveFixed6 === null ||
                status === "encrypting" ||
                status === "submitting"
              }
              aria-busy={status === "encrypting" || status === "submitting"}
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
                    {swapButtonLabel}
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
                    {swapButtonLabel}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {(status === "idle" || status === "error" || status === "done") && (
              <p className="mt-2 text-center text-xs text-success font-medium">MEV Protected by Fhenix</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
