"use client";

import { ArrowRightLeft, Sparkles } from "lucide-react";
import { NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useDealStageTransitions } from "@/hooks/api/crm/deals";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateOnly } from "@/lib/date-utils";
import { formatTime } from "@/lib/format-utils";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DealStageTransition } from "@/types/crm/stage-transitions";

/** Same three classes the timeline row composes, so the two surfaces match. */
function tone(name: StatusTone): string {
  const classes = statusToneClasses(name);
  return cn(classes.surface, classes.ink, classes.rule);
}

interface DealStageHistoryProps {
  dealId: number | null;
  /** Bring its own card, for a sidebar that mounts sections rather than lists. */
  card?: boolean;
}

function actorName(transition: DealStageTransition): string {
  if (transition.actorKind === "system") return transition.actorLabel ?? "The system";
  return transition.actorName ?? "Someone";
}

function describe(transition: DealStageTransition): string {
  const from = transition.fromStage;
  return from
    ? `${from} → ${transition.toStage}`
    : `Opened at ${transition.toStage}`;
}

/**
 * Every move this deal made, and what moved it.
 *
 * Separate from the activity timeline because a transition is a change of state
 * rather than something a person did, and ticket 08 models it apart so neither
 * can be mistaken for the other. A system move is marked, because a pipeline the
 * platform advances is only trustworthy if you can see where it did.
 */
export function DealStageHistory({ dealId, card }: DealStageHistoryProps) {
  const body = <StageHistoryBody dealId={dealId} />;

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:deals:read") === "denied")
    return <NoPermissionState permission="crm:deals:read" />;

  if (!card) return body;

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Stage History</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

function StageHistoryBody({ dealId }: { dealId: number | null }) {
  const { data, isLoading, isError, error, refetch, access } = useDealStageTransitions(dealId);
  const transitions = data?.data ?? [];

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );

  if (isError)
    return (
      <ErrorState
        title="Couldn't load the stage history"
        description={getErrorMessage(error)}
        onRetry={refetch}
      />
    );

  if (transitions.length === 0)
    return (
      <EmptyState
        access={access}
        title="No stage changes yet"
        description="Every move through the pipeline is recorded here, with who or what made it."
        compact
      />
    );

  return (
    <ol className="flex flex-col gap-3">
      {transitions.map((transition) => (
        <li key={transition.dealStageTransitionId} className="flex min-w-0 gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
              transition.actorKind === "system"
                ? tone("info")
                : "border-border bg-muted/50 text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {transition.actorKind === "system" ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 break-words text-sm font-medium">
                {describe(transition)}
              </span>
              {transition.actorKind === "system" ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 shrink-0 px-2 py-0.5 text-micro",
                    tone("info"),
                  )}
                >
                  Automatic
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {actorName(transition)} · {formatDateOnly(transition.occurredAt)}{" "}
              <span className="tabular-nums">{formatTime(transition.occurredAt)}</span>
            </p>

            {transition.reason ? (
              <p className="break-words text-xs text-muted-foreground">{transition.reason}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
