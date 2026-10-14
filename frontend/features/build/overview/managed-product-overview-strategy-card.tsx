"use client";

import Link from "next/link";
import { SettingsIcon } from "@animateicons/react/lucide";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <Button asChild variant="outline" className="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto">
          <Link href={settingsHref}>Add strategy</Link>
        </Button>
      </section>
    );
  }

  const metrics = product.successMetrics ?? [];
  const hasDetail =
    !!product.missionStatement ||
    !!product.targetCustomer ||
    !!product.northStarMetric ||
    !!product.differentiators ||
    metrics.length > 0;
  return (
    <OverviewPanel
      title="Strategy"
      action={canUpdate ? <OverviewSectionLink href={settingsHref} icon={SettingsIcon}>Edit strategy</OverviewSectionLink> : undefined}
    >
      {hasDetail ? (
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {product.missionStatement ? <StrategyRow label="Mission" value={product.missionStatement} /> : null}
          {product.targetCustomer ? <StrategyRow label="Target customer" value={product.targetCustomer} /> : null}
          {product.northStarMetric ? <StrategyRow label="North-star metric" value={product.northStarMetric} /> : null}
          {product.differentiators ? <StrategyRow label="Differentiators" value={product.differentiators} /> : null}
        </dl>
      ) : (
        <p className="max-w-prose text-pretty text-sm text-muted-foreground">
          The vision is in the summary above. Add a mission, target customer, or north-star metric so roadmap trade-offs have a reference.
        </p>
      )}
      {metrics.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Success metrics</p>
          <ul className="flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <li
                key={metric.label}
                className="flex min-w-0 items-baseline gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-sm dark:border-background"
              >
                <span className="min-w-0 break-words text-foreground">{metric.label}</span>
                {metric.target ? (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">→ {metric.target}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </OverviewPanel>
  );
}
