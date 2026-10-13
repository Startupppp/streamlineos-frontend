"use client";

import { Gavel } from "lucide-react";
import { TelescopeIcon } from "@animateicons/react/lucide";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import { OverviewPanel, OverviewSectionLink } from "./overview-metric";

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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <Gavel aria-hidden className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No decisions recorded yet
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Accepting or declining an opportunity in Insights writes the
            decision and its reasoning here.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {decisions.map((decision) => (
            <li
              key={decision.id}
              className="group relative flex gap-3 pb-4 last:pb-0"
            >
              <span
                aria-hidden
                className="relative flex w-3 shrink-0 justify-center"
              >
                <span className="mt-1.5 size-2 rounded-full bg-primary ring-4 ring-primary/10" />
                <span className="absolute bottom-0 top-4 w-px bg-border group-last:hidden" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-medium text-foreground">
                    {decision.title}
                  </p>
                  {decision.decidedAt ? (
                    <time
                      dateTime={decision.decidedAt}
                      title={formatShortDate(decision.decidedAt)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(decision.decidedAt)}
                    </time>
                  ) : null}
                </div>
                {decision.note ? (
                  <p className="break-words text-xs text-muted-foreground">
                    {decision.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </OverviewPanel>
  );
}
