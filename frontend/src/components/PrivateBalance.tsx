"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { hexToBigInt, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useReadContracts, useWalletClient } from "wagmi";
import { configuredChain, VAULT_ABI, VAULT_ADDRESS } from "@/lib/contracts";
import {
  USDC_ARBITRUM_SEPOLIA,
  WETH_ARBITRUM_SEPOLIA,
  MOCK_USDC_LOCAL,
  MOCK_WETH_LOCAL,
} from "@/lib/tokens";
import { initCofhe, unsealCt } from "@/lib/cofhe";
import { getCofheEnvironment } from "@/lib/cofheEnv";
import { formatUnits } from "viem";

type TokenRow = { symbol: string; icon: string; token: Address };
const isLocalChain = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614) === 31337;

export default function PrivateBalance() {
  const [revealed, setRevealed] = useState(false);
  const [balancesPlain, setBalancesPlain] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: configuredChain.id });
  const { data: walletClient } = useWalletClient({ chainId: configuredChain.id });

  const tokens: TokenRow[] =
    isLocalChain
      ? [
          { symbol: "ETH", icon: "⟠", token: MOCK_WETH_LOCAL },
          { symbol: "USDC", icon: "◉", token: MOCK_USDC_LOCAL },
        ]
      : [
          { symbol: "WETH", icon: "⟠", token: WETH_ARBITRUM_SEPOLIA },
          { symbol: "USDC", icon: "◉", token: USDC_ARBITRUM_SEPOLIA },
        ];

  const contracts = tokens.map((t) => ({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getBalance" as const,
    args: [t.token] as const,
    chainId: configuredChain.id,
  }));

  const { data, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(isConnected && address && VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000"),
    },
  });

  const revealOne = async (symbol: string, handle: Hex) => {
    if (!publicClient || !walletClient) return;
    setLoading(symbol);
    try {
      await initCofhe(publicClient, walletClient, getCofheEnvironment());
      const ctHash = hexToBigInt(handle);
      const raw = await unsealCt(ctHash);
      setBalancesPlain((p) => ({ ...p, [symbol]: formatUnits(raw, 6) }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const revealAll = async () => {
    setRevealed(true);
    if (!data) return;
    for (let i = 0; i < tokens.length; i++) {
      const res = data[i];
      if (res?.status !== "success" || !res.result) continue;
      const handle = res.result as Hex;
      await revealOne(tokens[i].symbol, handle);
    }
    await refetch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Vault (encrypted balances)</p>
          <h3 className="text-2xl font-bold font-mono text-foreground">
            {!revealed ? "🔒 ••••••••" : "🔓 revealed"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (revealed) {
              setRevealed(false);
              setBalancesPlain({});
            } else void revealAll();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : revealed ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>

      <div className="space-y-3">
        {tokens.map((token, i) => {
          const res = data?.[i];
          const handle =
            res?.status === "success" && res.result ? (res.result as Hex) : ("0x" + "0".repeat(64)) as Hex;
          const short = `${handle.slice(0, 6)}…${handle.slice(-4)}`;
          const plain = balancesPlain[token.symbol];
          return (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{token.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{token.symbol}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {revealed && plain ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground">
                        {plain}
                      </motion.span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        {short}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-success">
                <TrendingUp className="w-3 h-3" />—
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
