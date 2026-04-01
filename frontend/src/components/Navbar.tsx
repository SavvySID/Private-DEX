"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { WalletButton } from "@/components/WalletButton";

const links = [
  { href: "/swap", label: "Swap" },
  { href: "/orders", label: "Orders" },
  { href: "/pool", label: "Pool" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:glow-border transition-all">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Private<span className="text-primary glow-text">DEX</span>
            </span>
          </Link>

          <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href || (link.href === "/swap" && pathname === "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <WalletButton />
      </div>
    </motion.nav>
  );
}
