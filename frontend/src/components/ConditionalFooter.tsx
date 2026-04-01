"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="border-t border-border py-8 mt-auto">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            Private<span className="text-primary">DEX</span>
          </span>
        </Link>
        <p>
          🔒 Privacy-by-Design · Powered by Fhenix FHE · Built for Fhenix Buildathon 2026
        </p>
      </div>
    </footer>
  );
}
