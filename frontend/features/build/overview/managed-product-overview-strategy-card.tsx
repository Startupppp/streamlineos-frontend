"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { OverviewPanel, OverviewSectionLink } from "./overview-metric";
import { hasStrategy } from "./overview-signals";

interface StrategyCardProps {
  managedProductId: number;
  product: ManagedProductSummary["product"];
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ManagedProductOverviewStrategyCard({
  managedProductId,
  product,
}: StrategyCardProps) {
  const canUpdate = useCan("build:managed-products:update");
  const settingsHref = `/build/managed-products/${managedProductId}/settings`;

  if (!hasStrategy(product)) {
    if (!canUpdate) return null;
    return (
      <section
        aria-label="Strategy"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-4 sm:flex-row sm:items-center"
      >
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Compass className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">No strategy defined yet</p>
          <p className="text-xs text-muted-foreground">
            A vision, target customer and north-star metric give every roadmap trade-off a reference point.
          </p>
        </div>
        <Link
          href={settingsHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
        >
          Add strategy
        </Link>
      </section>
    );
  }

  const metrics = product.successMetrics ?? [];
  return (
    <OverviewPanel
      title="Strategy"
      action={canUpdate ? <OverviewSectionLink href={settingsHref}>Edit strategy</OverviewSectionLink> : undefined}
    >
      {product.vision ? (
        <p className="max-w-prose text-balance text-base font-medium leading-snug text-foreground">{product.vision}</p>
      ) : null}
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {product.missionStatement ? <StrategyRow label="Mission" value={product.missionStatement} /> : null}
        {product.targetCustomer ? <StrategyRow label="Target customer" value={product.targetCustomer} /> : null}
        {product.northStarMetric ? <StrategyRow label="North-star metric" value={product.northStarMetric} /> : null}
        {product.differentiators ? <StrategyRow label="Differentiators" value={product.differentiators} /> : null}
      </dl>
      {metrics.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Success metrics</p>
          <ul className="flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <li
                key={metric.label}
                className="flex items-baseline gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm"
              >
                <span className="text-foreground">{metric.label}</span>
                {metric.target ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">→ {metric.target}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </OverviewPanel>
  );
}
