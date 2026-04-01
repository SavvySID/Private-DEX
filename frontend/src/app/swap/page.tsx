"use client";

import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import SwapCard from "@/components/SwapCard";
import PrivateBalance from "@/components/PrivateBalance";

export default function SwapPage() {
  return (
    <div className="container pt-24 pb-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Encrypted Swap</h1>
        <p className="text-sm text-muted-foreground">
          Your amount is encrypted client-side before touching the chain.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto mb-10 items-start">
        <div className="flex justify-center xl:justify-end">
          <SwapCard />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-xs font-mono text-muted-foreground text-center xl:text-left">
            This is what MEV bots see on PrivateDEX
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border overflow-hidden">
            <div className="p-6 border-b sm:border-b-0 sm:border-r border-border bg-destructive/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-destructive" />
                <span className="text-xs font-mono text-destructive uppercase tracking-widest">Before</span>
              </div>
              <dl className="space-y-3 text-xs text-muted-foreground font-mono">
                <div className="flex justify-between gap-2">
                  <dt>Wallet</dt>
                  <dd className="text-destructive text-right break-all">0x71C7…9A2e</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Amount</dt>
                  <dd className="text-destructive text-right">2.4300 ETH</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Token</dt>
                  <dd className="text-destructive text-right">WETH → USDC</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Timestamp</dt>
                  <dd className="text-destructive text-right">block+tx public</dd>
                </div>
              </dl>
            </div>
            <div className="p-6 bg-primary/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <EyeOff className="w-5 h-5 text-primary" />
                <span className="text-xs font-mono text-primary uppercase tracking-widest">After</span>
              </div>
              <dl className="space-y-3 text-xs text-muted-foreground font-mono">
                <div className="flex justify-between gap-2">
                  <dt>Wallet</dt>
                  <dd className="text-primary text-right">🔒 Encrypted</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Amount</dt>
                  <dd className="text-primary text-right">🔒 Encrypted</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Token</dt>
                  <dd className="text-primary text-right">pair visible only</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Timestamp</dt>
                  <dd className="text-primary text-right">🔒 Encrypted</dd>
                </div>
              </dl>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-md mx-auto xl:max-w-6xl xl:mx-auto">
        <PrivateBalance />
      </div>
    </div>
  );
}
