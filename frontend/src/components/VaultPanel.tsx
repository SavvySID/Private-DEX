"use client";

import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { BaseError, parseUnits, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { configuredChain, VAULT_ABI, VAULT_ADDRESS } from "@/lib/contracts";
import {
  USDC_ARBITRUM_SEPOLIA,
  WETH_ARBITRUM_SEPOLIA,
  MOCK_USDC_LOCAL,
  MOCK_WETH_LOCAL,
} from "@/lib/tokens";
import { encryptSingle, initCofhe, mapCoFheInput } from "@/lib/cofhe";
import { getCofheEnvironment } from "@/lib/cofheEnv";
import { humanToFixed6 } from "@/lib/swapMath";
import { getBufferedFees } from "@/lib/gas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const isLocalChain = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614) === 31337;
const isLocalHardhat = configuredChain.id === 31337;

type VaultToken = {
  symbol: string;
  icon: string;
  token: Address;
  /** ERC20 decimals for the plaintext `transferFrom`/`transfer` leg. */
  decimals: number;
};

const VAULT_TOKENS: VaultToken[] = isLocalChain
  ? [
      { symbol: "ETH", icon: "⟠", token: MOCK_WETH_LOCAL, decimals: 18 },
      { symbol: "USDC", icon: "◉", token: MOCK_USDC_LOCAL, decimals: 6 },
    ]
  : [
      { symbol: "WETH", icon: "⟠", token: WETH_ARBITRUM_SEPOLIA, decimals: 18 },
      { symbol: "USDC", icon: "◉", token: USDC_ARBITRUM_SEPOLIA, decimals: 6 },
    ];

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type VaultMode = "deposit" | "withdraw";
type VaultStatus = "idle" | "approving" | "encrypting" | "submitting" | "done" | "error";

const isVaultDeployed = Boolean(VAULT_ADDRESS) && VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000";

function formatVaultError(error: unknown): string {
  if (error instanceof BaseError) return error.shortMessage || error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

const TokenSelectTrigger = forwardRef<
  HTMLButtonElement,
  { token: VaultToken; className?: string } & ComponentPropsWithoutRef<"button">
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
TokenSelectTrigger.displayName = "VaultTokenSelectTrigger";

export default function VaultPanel() {
  const [mode, setMode] = useState<VaultMode>("deposit");
  const [token, setToken] = useState<VaultToken>(VAULT_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<VaultStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient({ chainId: configuredChain.id });
  const { data: walletClient } = useWalletClient({ chainId: configuredChain.id });
  const { writeContractAsync } = useWriteContract();

  const busy = status === "approving" || status === "encrypting" || status === "submitting";

  const canSubmit = useMemo(() => {
    if (!isVaultDeployed || !isConnected || busy) return false;
    if (!amount.trim()) return false;
    const n = Number.parseFloat(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount, busy, isConnected]);

  const selectToken = (next: VaultToken) => {
    if (status === "done" || status === "error") {
      setStatus("idle");
      setError(null);
    }
    setToken(next);
  };

  const switchMode = (next: VaultMode) => {
    setMode(next);
    setStatus("idle");
    setError(null);
  };

  const runAction = async () => {
    setError(null);

    if (!publicClient || !walletClient || !address) {
      setError("Connect your wallet on the correct network.");
      setStatus("error");
      return;
    }

    let encFixed6: bigint;
    let plainAmount: bigint;
    try {
      encFixed6 = humanToFixed6(amount);
      plainAmount = parseUnits(amount.trim(), token.decimals);
    } catch (e) {
      setError(formatVaultError(e));
      setStatus("error");
      return;
    }

    try {
      // CoFHE setup (encrypt-only; skip permit on local Hardhat like the swap flow).
      setStatus("encrypting");
      const env = getCofheEnvironment();
      const skipPermit = isLocalHardhat || env === "MOCK" || env === "LOCAL";
      await initCofhe(publicClient, walletClient, env, {
        generatePermit: !skipPermit,
        ignoreTfheErrors: isLocalHardhat,
        walletChainId,
      });

      const enc = await encryptSingle(encFixed6);
      const encInput = mapCoFheInput(enc);

      // Deposit pulls ERC20 via transferFrom → ensure allowance first.
      if (mode === "deposit") {
        const code = await publicClient.getCode({ address: token.token });
        if (!code || code === "0x") {
          throw new Error(
            `${token.symbol} token contract not found at ${token.token}. ` +
              `Deploy test tokens with "npm run deploy:tokens", restart the dev server, then reload.`,
          );
        }

        const allowance = (await publicClient.readContract({
          address: token.token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, VAULT_ADDRESS],
        })) as bigint;

        if (allowance < plainAmount) {
          setStatus("approving");
          const approveFees = await getBufferedFees(publicClient);
          const approveHash = await writeContractAsync({
            address: token.token,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [VAULT_ADDRESS, plainAmount],
            chainId: configuredChain.id,
            ...(approveFees ?? {}),
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      setStatus("submitting");
      const fees = await getBufferedFees(publicClient);
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: mode,
        args: [token.token, encInput, plainAmount],
        chainId: configuredChain.id,
        ...(fees ?? {}),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("done");
      setAmount("");
    } catch (e) {
      console.error(e);
      setError(`${mode === "deposit" ? "Deposit" : "Withdraw"} failed: ${formatVaultError(e)}`);
      setStatus("error");
    }
  };

  const mintTestTokens = async () => {
    setFaucetMsg(null);
    setError(null);
    if (!publicClient || !walletClient || !address) {
      setError("Connect your wallet on the correct network.");
      return;
    }
    try {
      setFaucetBusy(true);
      const code = await publicClient.getCode({ address: token.token });
      if (!code || code === "0x") {
        throw new Error(
          `${token.symbol} token contract not found at ${token.token}. ` +
            `Run "npm run deploy:tokens", restart the dev server, then reload.`,
        );
      }
      const amountToMint = parseUnits("1000", token.decimals);
      const fees = await getBufferedFees(publicClient);
      const hash = await writeContractAsync({
        address: token.token,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, amountToMint],
        chainId: configuredChain.id,
        ...(fees ?? {}),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setFaucetMsg(`Minted 1000 ${token.symbol} to your wallet.`);
    } catch (e) {
      setError(`Mint failed: ${formatVaultError(e)}`);
    } finally {
      setFaucetBusy(false);
    }
  };

  const actionLabel = (() => {
    if (status === "approving") return "Approving token…";
    if (status === "encrypting") return "Encrypting…";
    if (status === "submitting") return mode === "deposit" ? "Depositing…" : "Withdrawing…";
    if (status === "done") return "Done ✅";
    if (status === "error") return "Try Again";
    return mode === "deposit" ? "Deposit" : "Withdraw";
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card min-w-0 rounded-2xl p-1"
    >
      <div className="min-w-0 rounded-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Private Vault</h2>
            <p className="text-xs text-muted-foreground">Deposit & withdraw with encrypted balances.</p>
          </div>
          <div className="encrypted-badge">
            <ShieldCheck className="w-3 h-3" />
            euint64
          </div>
        </div>

        {!isVaultDeployed && (
          <div className="mx-4 mb-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            Deploy contracts and set <span className="font-mono">NEXT_PUBLIC_VAULT_ADDRESS</span> in{" "}
            <span className="font-mono">frontend/.env.local</span>, then restart the dev server.
          </div>
        )}

        <div className="px-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => switchMode("deposit")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
                mode === "deposit"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => switchMode("withdraw")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
                mode === "withdraw"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="rounded-xl bg-secondary p-3 sm:p-4 min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{mode === "deposit" ? "Amount to deposit" : "Amount to withdraw"}</span>
              <span className="text-xs text-muted-foreground">6dp uint64 · encrypted</span>
            </div>
            <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  if (status === "done" || status === "error") {
                    setStatus("idle");
                    setError(null);
                  }
                  setAmount(e.target.value);
                }}
                className="min-w-0 w-full bg-transparent text-xl sm:text-2xl font-mono font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TokenSelectTrigger
                    token={token}
                    className="justify-self-end"
                    aria-label={`Token: ${token.symbol}`}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 z-[100]">
                  {VAULT_TOKENS.map((t) => (
                    <DropdownMenuItem key={t.symbol} className="gap-2" onClick={() => selectToken(t)}>
                      <span aria-hidden>{t.icon}</span>
                      <span className="flex-1 font-medium">{t.symbol}</span>
                      {token.symbol === t.symbol ? <Check className="h-4 w-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <p className="font-semibold text-destructive">{mode === "deposit" ? "Deposit failed" : "Withdraw failed"}</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed break-words">{error}</p>
          </div>
        )}

        {status === "done" && !error && (
          <p className="mx-4 mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
            {mode === "deposit" ? "Deposit confirmed." : "Withdraw confirmed."} Reveal below to see your new encrypted balance.
          </p>
        )}

        <div className="p-4">
          <button
            type="button"
            onClick={() => void runAction()}
            disabled={!canSubmit}
            aria-busy={busy}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "deposit" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
            {actionLabel}
          </button>
          {mode === "deposit" && (
            <>
              <button
                type="button"
                onClick={() => void mintTestTokens()}
                disabled={faucetBusy || !isConnected}
                className="mt-2 w-full rounded-xl border border-border bg-secondary/60 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {faucetBusy ? `Minting ${token.symbol}…` : `Mint 1000 test ${token.symbol}`}
              </button>
              {faucetMsg && (
                <p className="mt-2 text-center text-[11px] text-success">{faucetMsg}</p>
              )}
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Deposits approve the vault for the ERC20 token, then add the encrypted amount on-chain.
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
