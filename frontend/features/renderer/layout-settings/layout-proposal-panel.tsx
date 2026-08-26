"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MIN_SAMPLE, proposeFromFill } from "@/lib/renderer/layout-proposal";
import type { LayoutAdjustment } from "@/lib/renderer/layout-adjustment";
import type { RecordLayout } from "@/lib/renderer/layout";
import { useLayoutUsage } from "@/hooks/api/renderer/layouts";

export interface LayoutProposalPanelProps {
  layout: RecordLayout;
  onApply: (adjustment: LayoutAdjustment) => void;
  disabled?: boolean;
}

/**
 * What the tenant's own records suggest this layout should be.
 *
 * The alternative is a screen of checkboxes and a paragraph asking an
 * administrator to think about each field, which is the failure "make it
 * configurable" always produces: the work is real, nobody does it, and the
 * default is what everyone lives with anyway. The records already say which
 * fields this organisation uses.
 *
 * It proposes and never applies. The evidence is on screen beside the
 * conclusion, because an administrator asked to accept a rearrangement of their
 * colleagues' screens deserves to see the argument.
 */
export function LayoutProposalPanel({ layout, onApply, disabled }: LayoutProposalPanelProps) {
  const usage = useLayoutUsage(layout.key);

  if (usage.isLoading)
    return (
      <div className="flex flex-col gap-gap-inline rounded-xl border border-border bg-card p-card-pad">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );

  if (usage.isError)
    return (
      <ErrorState
        compact
        title="Couldn't read how this record type is filled in"
        description="The suggestion needs a count of what your records actually carry. Nothing has been changed."
        onRetry={() => void usage.refetch()}
      />
    );

  const proposal = usage.data
    ? proposeFromFill(layout, usage.data.sample, usage.data.filled)
    : null;

  if (!proposal)
    return (
      <EmptyState
        compact
        title="Not enough records to suggest anything yet"
        description={`A suggestion is read from what your team has filled in. It needs at least ${MIN_SAMPLE} ${layout.plural.toLowerCase()}; there ${usage.data?.sample === 1 ? "is" : "are"} ${usage.data?.sample ?? 0}.`}
      />
    );

  return (
    <div className="flex min-w-0 flex-col gap-gap-toolbar rounded-xl border border-border bg-card p-card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-gap-field">
        <h3 className="text-label font-medium">
          Suggested from {proposal.sample} {layout.plural.toLowerCase()}
        </h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onApply(proposal.adjustment)}
        >
          Use this arrangement
        </Button>
      </div>

      <p className="text-dense text-muted-foreground">
        {proposal.hiding.length > 0
          ? `${proposal.hiding.length} field${proposal.hiding.length === 1 ? " has" : "s have"} never been filled in and would be hidden. Hiding never deletes anything — unhide a field and its values are there.`
          : "Every field is in use, so nothing would be hidden. The order below follows how often each is filled."}
      </p>

      <ul className="flex flex-col gap-gap-inline">
        {proposal.usage.map((entry) => (
          <li key={entry.field} className="flex min-w-0 items-center gap-gap-field">
            <span className="min-w-0 flex-1 truncate text-dense">{entry.label}</span>
            <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
              {entry.filled} of {proposal.sample}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
