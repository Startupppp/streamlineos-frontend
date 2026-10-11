"use client";

import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

interface StrategyCardProps {
  managedProductId: number;
  product: ManagedProductSummary["product"];
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border/80 py-2 sm:border-b-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ManagedProductOverviewStrategyCard({
  managedProductId,
  product,
}: StrategyCardProps) {
  const canUpdate = useCan("build:managed-products:update");
  const hasStrategy =
    !!product.missionStatement ||
    !!product.targetCustomer ||
    !!product.northStarMetric ||
    !!product.vision;

  if (!hasStrategy) {
    if (!canUpdate) return null;
    return (
      <p className="text-sm text-muted-foreground">
        No strategy defined yet.{" "}
        <Link
          href={`/build/managed-products/${managedProductId}/settings`}
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
        >
          Add strategy
        </Link>
      </p>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">Strategy</h2>
      <div className="mt-1 grid gap-x-8 sm:grid-cols-2">
        {product.missionStatement ? (
          <StrategyRow label="Mission" value={product.missionStatement} />
        ) : null}
        {product.targetCustomer ? (
          <StrategyRow label="Target customer" value={product.targetCustomer} />
        ) : null}
        {product.northStarMetric ? (
          <StrategyRow label="North-star metric" value={product.northStarMetric} />
        ) : null}
        {product.vision ? <StrategyRow label="Vision" value={product.vision} /> : null}
      </div>
    </section>
  );
}
