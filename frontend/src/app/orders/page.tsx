"use client";

import OrderTable from "@/components/OrderTable";

export default function OrdersPage() {
  return (
    <div className="container pt-24 pb-16 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Private Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All order amounts are encrypted on-chain. Use <span className="text-primary font-mono">Reveal</span>{" "}
          to decrypt filled orders with your signed permit.
        </p>
      </div>
      <OrderTable />
    </div>
  );
}
