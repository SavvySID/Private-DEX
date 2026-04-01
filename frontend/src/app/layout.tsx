import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "@/providers";
import Navbar from "@/components/Navbar";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PrivateDEX",
  description: "MEV-protected dark pool DEX with Fhenix CoFHE encryption.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0a0a] antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}
