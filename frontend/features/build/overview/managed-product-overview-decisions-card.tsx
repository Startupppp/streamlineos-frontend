"use client";

import { Gavel } from "lucide-react";
import { TelescopeIcon } from "@animateicons/react/lucide";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { OverviewPanel, OverviewSectionLink } from "./overview-metric";

type DecisionPreview = ManagedProductSummary["previews"]["decisions"][number];

function DecisionEntry({
  decision,
  index,
  featured,
}: {
  decision: DecisionPreview;
  index: number;
  featured: boolean;
}) {
  return (
    <li
      className={cn(
        "flex gap-3",
        featured
          ? "mb-3 rounded-lg border border-border bg-muted p-3 last:mb-0 dark:border-background"
          : "border-b border-border py-3 last:border-b-0",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md font-mono text-xs tabular-nums",
          featured
            ? "size-9 border border-border bg-card text-foreground dark:border-background"
            : "mt-0.5 size-7 text-muted-foreground",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <p className={cn("min-w-0 break-words text-sm text-foreground", featured ? "font-semibold" : "font-medium")}>
            {decision.title}
          </p>
          {decision.decidedAt ? (
            <time
              dateTime={decision.decidedAt}
              className="flex shrink-0 flex-col text-xs text-muted-foreground sm:items-end"
            >
              <span>{formatRelativeTime(decision.decidedAt)}</span>
              <span className="font-mono tabular-nums">{formatShortDate(decision.decidedAt)}</span>
            </time>
          ) : null}
        </div>
        {decision.note ? (
          <p className="text-pretty text-xs text-muted-foreground">{decision.note}</p>
        ) : null}
      </div>
    </li>
  );
}

interface DecisionsCardProps {
  managedProductId: number;
  decisions: ManagedProductSummary["previews"]["decisions"];
}

export function ManagedProductOverviewDecisionsCard({
  managedProductId,
  decisions,
}: DecisionsCardProps) {
  return (
    <OverviewPanel
      title="Decision log"
      description="The latest calls made on this product, and why."
      action={
        <OverviewSectionLink
          href={`/build/managed-products/${managedProductId}/insights`}
          icon={TelescopeIcon}
        >
          Open insights
        </OverviewSectionLink>
      }
    >
      {decisions.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-3 dark:border-background">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground dark:border-background"
          >
            <Gavel className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">No decisions recorded yet</p>
              <p className="font-mono text-2xl font-semibold tabular-nums leading-none text-muted-foreground">0</p>
            </div>
            <p className="text-pretty text-xs text-muted-foreground">
              Accepting or declining an opportunity in Insights writes the decision and its reasoning here.
            </p>
          </div>
        </div>
      ) : (
        <ol className="flex flex-col">
          {decisions.map((decision, index) => (
            <DecisionEntry
              key={decision.id}
              decision={decision}
              index={index}
              featured={index === 0}
            />
          ))}
        </ol>
      )}
    </OverviewPanel>
  );
}
