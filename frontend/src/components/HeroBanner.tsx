import { Shield, Zap, Eye } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, label: "FHE Encrypted", desc: "Amounts never exposed" },
  { icon: Zap, label: "Zero MEV", desc: "Front-running eliminated" },
  { icon: Eye, label: "Dark Pool", desc: "Intent-level privacy" },
];

const HeroBanner = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center mb-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        <span className="text-xs font-mono text-primary">Mainnet Live · CoFHE Active</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl md:text-4xl font-bold text-foreground mb-3"
      >
        Swap without being{" "}
        <span className="text-primary glow-text">seen</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-muted-foreground max-w-md mx-auto mb-8"
      >
        Fully homomorphic encryption on every trade. Your amounts, intents, and orders stay ciphertext — from mempool to settlement.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-6"
      >
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span>{f.label}</span>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default HeroBanner;
