"use client";

import { useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  MoveRight,
  UserPlus,
  Mail,
  FileText,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  KIND_LABELS,
  OUTCOME_LABELS,
  type AutonomousDecision,
  type DecisionKind,
  type DecisionOutcome,
} from "@/types/crm/autonomy";

function tone(name: StatusTone): string {
  const classes = statusToneClasses(name);
  return cn(classes.surface, classes.ink, classes.rule);
}

const KIND_ICON: Record<DecisionKind, typeof CheckSquare> = {
  "task.extracted": CheckSquare,
  "stage.advanced": MoveRight,
  "party.created": UserPlus,
  "activity.logged": Mail,
  "quote.sent": FileText,
};

/**
 * Outcome tones.
 *
 * `skipped` is deliberately neutral rather than a warning: the system choosing
 * not to act is the safety mechanism working, and colouring it as a problem
 * would teach a reader to scroll past the entries that mean the most.
 */
const OUTCOME_TONE: Record<DecisionOutcome, StatusTone> = {
  applied: "success",
  held: "warning",
  skipped: "neutral",
  reversed: "info",
  failed: "danger",
};

/** What it acted on, named rather than identified. */
function subjectOf(decision: AutonomousDecision): string | null {
  return decision.dealName ?? decision.partyName ?? null;
}

export interface DecisionEntryRowProps {
  decision: AutonomousDecision;
  canReverse: boolean;
  onReverse: (decisionId: string) => void;
  isReversing?: boolean;
}

/**
 * One thing the system did, explained.
 *
 * The feed is the whole oversight mechanism — nothing asked for approval — so
 * the default view is what a manager needs to judge the decision, and the
 * operator's identifiers sit behind a disclosure rather than competing with it.
 */
export function DecisionEntryRow({
  decision,
  canReverse,
  onReverse,
  isReversing = false,
}: DecisionEntryRowProps) {
  const [showDetail, setShowDetail] = useState(false);

  const Icon = KIND_ICON[decision.kind];
  const outcomeTone = OUTCOME_TONE[decision.outcome];
  const subject = subjectOf(decision);

  /**
   * Reversible right now — not merely reversible in principle.
   *
   * A skipped decision changed nothing, and one already reversed cannot be
   * reversed twice. The server refuses both anyway; hiding the control means a
   * reader is never offered an undo that will fail.
   */
  const canUndo =
    canReverse &&
    decision.reversibility === "instant" &&
    decision.outcome === "applied" &&
    decision.reversedAt === null;

  return (
    <li
      className={cn(
        "flex flex-col gap-gap-field border-b border-border",
        "p-card-pad",
        "last:border-b-0",
      )}
      data-testid="decision-entry"
    >
      <div className="flex items-start gap-gap-inline">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
            tone(outcomeTone),
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          {/* Wraps on a phone, sits on one line from sm up. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{KIND_LABELS[decision.kind]}</span>
            {subject ? (
              <span className="truncate text-sm text-muted-foreground">{subject}</span>
            ) : null}
            <Badge variant="outline" className={cn("text-micro", tone(outcomeTone))}>
              {OUTCOME_LABELS[decision.outcome]}
            </Badge>
          </div>

          {/* The explanation, in the system's own words. */}
          {decision.summary ? (
            <p className="mt-1 text-sm text-muted-foreground">{decision.summary}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
            {/* Relative to read, exact on hover — an audit trail must answer "when exactly". */}
            <time dateTime={decision.decidedAt} title={new Date(decision.decidedAt).toLocaleString()}>
              {formatRelativeTime(decision.decidedAt)}
            </time>
            {decision.confidence !== null ? (
              <span>{Math.round(decision.confidence * 100)}% confident</span>
            ) : (
              // No score rather than a fabricated one: this decision was
              // deterministic, and showing "100%" would invent a measurement.
              <span>No model involved</span>
            )}
            {decision.reversedAt ? (
              <span className={statusToneClasses("info").ink}>
                Undone {formatRelativeTime(decision.reversedAt)}
                {decision.reversedReason ? ` — ${decision.reversedReason}` : ""}
              </span>
            ) : null}
          </div>
        </div>

        {canUndo ? (
          <LoadingButton
            variant="outline"
            size="sm"
            className="shrink-0"
            isPending={isReversing}
            onClick={() => onReverse(decision.autonomousDecisionId)}
          >
            <Undo2 className="size-4 sm:mr-1.5" />
            <span className="sr-only sm:not-sr-only">Undo</span>
          </LoadingButton>
        ) : null}
      </div>

      {/* The operator's half. Present on every entry, in the way of none. */}
      {decision.model || decision.promptVersion ? (
        <div className="pl-11">
          <button
            type="button"
            onClick={() => setShowDetail((open) => !open)}
            className="flex items-center gap-1 text-micro text-muted-foreground hover:text-foreground"
            aria-expanded={showDetail}
          >
            <ChevronDown className={cn("size-3 transition-transform", showDetail && "rotate-180")} />
            How this was decided
          </button>

          {showDetail ? (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-micro text-muted-foreground">
              <dt>Model</dt>
              <dd className="font-mono">{decision.model ?? "none"}</dd>
              <dt>Prompt</dt>
              <dd className="font-mono">{decision.promptVersion ?? "none"}</dd>
              <dt>Triggered by</dt>
              <dd className="font-mono break-all">
                {decision.triggerType}
                {decision.triggerId ? ` · ${decision.triggerId}` : ""}
              </dd>
            </dl>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
