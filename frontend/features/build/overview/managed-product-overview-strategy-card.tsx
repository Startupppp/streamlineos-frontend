"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCan } from "@/hooks/api/access";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

interface StrategyCardProps {
  managedProductId: number;
  product: ManagedProductSummary["product"];
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm">{value}</p>
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
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            No strategy defined yet.{" "}
            <Link
              href={`/build/managed-products/${managedProductId}/settings`}
              className="text-primary underline-offset-2 hover:underline"
            >
              Add strategy
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-sm font-semibold text-foreground">Strategy</h2>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {product.missionStatement ? (
          <StrategyRow label="Mission" value={product.missionStatement} />
        ) : null}
        {product.targetCustomer ? (
          <StrategyRow label="Target customer" value={product.targetCustomer} />
        ) : null}
        {product.northStarMetric ? (
          <StrategyRow label="North-star metric" value={product.northStarMetric} />
        ) : null}
        {product.vision ? (
          <StrategyRow label="Vision" value={product.vision} />
        ) : null}
      </CardContent>
    </Card>
  );
}
