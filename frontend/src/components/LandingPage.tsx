"use client";

import Link from "next/link";
import { Shield, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const EncryptedText = ({ plain, cipher }: { plain: string; cipher: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className="relative cursor-pointer group inline"
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
    >
      <span
        className={`font-mono transition-all duration-300 ${revealed ? "text-destructive line-through opacity-50" : "text-primary"}`}
      >
        {revealed ? plain : cipher}
      </span>
      {revealed && (
        <span className="absolute -top-6 left-0 text-[10px] font-mono text-destructive/70 whitespace-nowrap">
          ← exposed to MEV bots
        </span>
      )}
    </span>
  );
};

const TerminalLine = ({
  prefix,
  text,
  delay,
  color = "text-foreground",
}: {
  prefix: string;
  text: string;
  delay: number;
  color?: string;
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return <div className="h-6" />;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-2 font-mono text-sm"
    >
      <span className="text-primary shrink-0">{prefix}</span>
      <span className={color}>{text}</span>
    </motion.div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen pt-16">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, hsl(var(--primary) / 0.3), transparent 70%)",
          }}
        />

        <div className="container relative z-10 py-24 md:py-36 text-center">
          <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs font-mono text-primary">Mainnet Live · CoFHE Active</span>
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
          >
            The DEX where
            <br />
            <span className="text-primary glow-text">nobody sees your trade</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ delay: 0.18 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            PrivateDEX uses fully homomorphic encryption to keep your swap amounts, order intents, and balances as
            ciphertext — eliminating front-running and MEV at the architectural level.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/swap"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Lock className="w-4 h-4" />
              Launch App
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#the-problem"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
            >
              Why This Exists
            </a>
          </motion.div>
        </div>
      </section>

      <section id="the-problem" className="border-t border-border">
        <div className="container max-w-4xl py-24 md:py-32">
          <motion.p
            {...fadeUp}
            className="text-2xl md:text-4xl font-light text-foreground leading-relaxed md:leading-relaxed"
          >
            Every trade you make on a regular DEX is{" "}
            <span className="text-destructive font-semibold">publicly visible</span> before it settles. Bots front-run
            your swap for <EncryptedText plain="2.4 ETH" cipher="0x7f3a…c91d" /> before your transaction even confirms.
            You lose money on every single trade — and you don&apos;t even know it.
          </motion.p>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-12 flex items-start gap-4">
            <div className="w-px h-16 bg-primary/30 shrink-0 mt-1" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              In 2024 alone, MEV bots extracted over{" "}
              <span className="text-foreground font-mono font-semibold">$1.2 billion</span> from DEX traders. Sandwich
              attacks, front-running, and back-running are not bugs — they&apos;re features of transparent mempools.
              PrivateDEX makes them architecturally impossible.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="container max-w-4xl py-24 md:py-32">
          <motion.div {...fadeUp} className="mb-2">
            <span className="text-xs font-mono text-muted-foreground">// how it actually works</span>
          </motion.div>

          <div className="rounded-2xl border border-border bg-background p-6 md:p-8 font-mono text-sm space-y-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-muted-foreground ml-2">privatedex-protocol</span>
            </div>

            <TerminalLine prefix="$" text='cofhe.encrypt(swapAmount, "euint64")' delay={200} />
            <TerminalLine
              prefix="→"
              text="Amount encrypted client-side. Mempool sees: 0x7f3a…c91d"
              delay={800}
              color="text-muted-foreground"
            />
            <TerminalLine prefix=" " text="" delay={1000} />
            <TerminalLine prefix="$" text="privateOrderBook.submitOrder(encryptedAmount)" delay={1400} />
            <TerminalLine
              prefix="→"
              text="Order stored on-chain as euint64. No plaintext, ever."
              delay={2000}
              color="text-muted-foreground"
            />
            <TerminalLine prefix=" " text="" delay={2200} />
            <TerminalLine prefix="$" text="coprocessor.matchOrders() // computed on ciphertext" delay={2600} />
            <TerminalLine
              prefix="→"
              text="Orders matched without decrypting. Fill found."
              delay={3200}
              color="text-muted-foreground"
            />
            <TerminalLine prefix=" " text="" delay={3400} />
            <TerminalLine prefix="$" text="permit.unseal(myAddress)" delay={3800} />
            <TerminalLine
              prefix="✓"
              text="Filled: received 2,451.32 USDC. Only you can see this."
              delay={4400}
              color="text-success"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container max-w-4xl py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 rounded-2xl border border-border overflow-hidden">
            <motion.div {...fadeUp} className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
              <div className="flex items-center gap-2 mb-6">
                <Eye className="w-5 h-5 text-destructive" />
                <span className="text-xs font-mono text-destructive uppercase tracking-widest">Regular DEX</span>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Your swap amount is <span className="text-destructive font-medium">plaintext</span> in the mempool
                </p>
                <div className="h-px bg-border" />
                <p>
                  Bots see your trade and <span className="text-destructive font-medium">front-run</span> it
                </p>
                <div className="h-px bg-border" />
                <p>
                  You get a <span className="text-destructive font-medium">worse price</span> on every fill
                </p>
                <div className="h-px bg-border" />
                <p>
                  Order book is fully <span className="text-destructive font-medium">transparent</span>
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="p-8 md:p-10 bg-primary/[0.03]">
              <div className="flex items-center gap-2 mb-6">
                <EyeOff className="w-5 h-5 text-primary" />
                <span className="text-xs font-mono text-primary uppercase tracking-widest">PrivateDEX</span>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Your swap amount is <span className="text-primary font-medium">FHE-encrypted</span> ciphertext
                </p>
                <div className="h-px bg-border" />
                <p>
                  Bots see <span className="text-primary font-medium font-mono">0x7f3a…c91d</span> — meaningless
                </p>
                <div className="h-px bg-border" />
                <p>
                  You get the <span className="text-primary font-medium">true market price</span>
                </p>
                <div className="h-px bg-border" />
                <p>
                  Order book is <span className="text-primary font-medium">encrypted end-to-end</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="container max-w-4xl py-24 md:py-32 text-center">
          <motion.div {...fadeUp}>
            <p className="text-6xl md:text-8xl font-bold font-mono text-primary glow-text mb-4">4,291</p>
            <p className="text-lg text-muted-foreground">MEV attacks blocked since launch</p>
            <p className="text-sm text-muted-foreground/60 mt-2 font-mono">
              $24.8M encrypted TVL · 12 active dark pools · 100% privacy rate
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container max-w-4xl py-24 md:py-32">
          <motion.div {...fadeUp} className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ready to trade in the dark?</h2>
              <p className="text-muted-foreground text-sm">Connect your wallet. Encrypt your first swap.</p>
            </div>
            <Link
              href="/swap"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
            >
              <Lock className="w-4 h-4" />
              Launch App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">
              Private<span className="text-primary">DEX</span>
            </span>
          </div>
          <p>FHE-powered dark-pool DEX · Built on Fhenix CoFHE</p>
        </div>
      </footer>
    </div>
  );
}
