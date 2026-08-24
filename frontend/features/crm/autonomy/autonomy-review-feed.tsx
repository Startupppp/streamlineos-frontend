"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/api/access";
import { useAutonomyDecisions, useReverseDecision } from "@/hooks/api/crm/autonomy";
import { densityAttribute } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  DECISION_KINDS,
  DECISION_OUTCOMES,
  KIND_LABELS,
  OUTCOME_LABELS,
  type DecisionFilters,
  type DecisionKind,
  type DecisionOutcome,
} from "@/types/crm/autonomy";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { DecisionEntryRow } from "./decision-entry-row";

const ANY = "__any__";

/**
 * Everything the system did, in one place.
 *
 * Because nothing asks for approval, this feed is the entire oversight
 * mechanism. That makes readability a correctness property rather than a
 * nicety: a log dump nobody scrolls is the same as no oversight at all.
 */
export function AutonomyReviewFeed() {
  const [filters, setFilters] = useState<DecisionFilters>({});
  const [density, setDensity] = useDensity();

  const canReverse = useCan("crm:autonomy:reverse");
  const feed = useAutonomyDecisions(filters);
  const reverse = useReverseDecision();

  const decisions = feed.data?.pages.flatMap((page) => page.data) ?? [];

  const setFilter = <K extends keyof DecisionFilters>(key: K, value: DecisionFilters[K]) =>
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });

  return (
    <div className="flex flex-col gap-gap-grid" {...densityAttribute(density)}>
      {/* Toolbar. Wraps to two rows on a phone rather than scrolling sideways. */}
      <div className="flex flex-wrap items-center gap-gap-toolbar">
        <Select
          value={filters.kind ?? ANY}
          onValueChange={(value) =>
            setFilter("kind", value === ANY ? undefined : (value as DecisionKind))
          }
        >
          <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filter by what it did">
            <SelectValue placeholder="Anything it did" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Anything it did</SelectItem>
            {DECISION_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.outcome ?? ANY}
          onValueChange={(value) =>
            setFilter("outcome", value === ANY ? undefined : (value as DecisionOutcome))
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]" aria-label="Filter by outcome">
            <SelectValue placeholder="Any outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any outcome</SelectItem>
            {DECISION_OUTCOMES.map((outcome) => (
              <SelectItem key={outcome} value={outcome}>
                {OUTCOME_LABELS[outcome]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-gap-field">
          <Switch
            id="reversed-only"
            checked={filters.reversedOnly ?? false}
            onCheckedChange={(checked) => setFilter("reversedOnly", checked || undefined)}
          />
          <Label htmlFor="reversed-only" className="text-label">
            Only what we undid
          </Label>
        </div>

        <div className="flex items-center gap-gap-field">
          <Switch
            id="include-routine"
            checked={filters.includeRoutine ?? false}
            onCheckedChange={(checked) => setFilter("includeRoutine", checked || undefined)}
          />
          <Label htmlFor="include-routine" className="text-label">
            Include routine filing
          </Label>
        </div>

        {/* One shared control: density is the engine's property, not this screen's. */}
        <DensityToggle density={density} onChange={setDensity} className="ml-auto" />
      </div>

      {reverse.isError ? (
        <p role="alert" className="text-label text-status-danger-ink">
          {reverse.error instanceof Error
            ? reverse.error.message
            : "That could not be undone."}
        </p>
      ) : null}

      {feed.isLoading ? (
        <div className="flex flex-col gap-gap-field" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : decisions.length === 0 ? (
        <EmptyState
          illustrationPreset="report"
          title="Nothing to review"
          description={
            Object.keys(filters).length > 0
              ? "No actions match these filters."
              : "The system has not acted on its own yet. When it does, everything it decided appears here."
          }
        />
      ) : (
        <>
          <ul className={cn("rounded-lg border border-border bg-card")}>
            {decisions.map((decision) => (
              <DecisionEntryRow
                key={decision.autonomousDecisionId}
                decision={decision}
                canReverse={canReverse}
                onReverse={(decisionId) => reverse.mutate({ decisionId })}
                isReversing={reverse.isPending && reverse.variables?.decisionId === decision.autonomousDecisionId}
              />
            ))}
          </ul>

          {feed.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              disabled={feed.isFetchingNextPage}
              onClick={() => void feed.fetchNextPage()}
            >
              {feed.isFetchingNextPage ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Show earlier
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
