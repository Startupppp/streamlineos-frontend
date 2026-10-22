"use client";

import { useState } from "react";
import { CheckSquare, ChevronDown, FileText, HelpCircle, Mail, MoveRight, Send, Snowflake, Undo2, UserPlus, Wrench } from "lucide-react";
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
  "outbound.sent": Send,
  "cold_outbound.sent": Snowflake,
  "field.repaired": Wrench,
};

const OUTCOME_TONE: Record<DecisionOutcome, StatusTone> = {
  applied: "success",
  held: "warning",
  skipped: "neutral",
  reversed: "info",
  failed: "danger",
};

function subjectOf(decision: AutonomousDecision): string | null {
  return decision.dealName ?? decision.partyName ?? null;
}

export interface DecisionEntryRowProps {
  decision: AutonomousDecision;
  canReverse: boolean;
  onReverse: (decisionId: string) => void;
  isReversing?: boolean;
}

export function DecisionEntryRow({
  decision,
  canReverse,
  onReverse,
  isReversing = false,
}: DecisionEntryRowProps) {
  const [showDetail, setShowDetail] = useState(false);

  const Icon = KIND_ICON[decision.kind] ?? HelpCircle;
  const kindLabel = KIND_LABELS[decision.kind] ?? decision.kind;
  const outcomeTone = OUTCOME_TONE[decision.outcome] ?? "neutral";
  const outcomeLabel = OUTCOME_LABELS[decision.outcome] ?? decision.outcome;
  const subject = subjectOf(decision);

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
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{kindLabel}</span>
            {subject ? (
              <span className="truncate text-sm text-muted-foreground">{subject}</span>
            ) : null}
            <Badge variant="outline" className={cn("text-micro", tone(outcomeTone))}>
              {outcomeLabel}
            </Badge>
          </div>

          
          {decision.summary ? (
            <p className="mt-1 text-sm text-muted-foreground">{decision.summary}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
            
            <time dateTime={decision.decidedAt} title={new Date(decision.decidedAt).toLocaleString()}>
              {formatRelativeTime(decision.decidedAt)}
            </time>
            {decision.confidence !== null ? (
              <span>{Math.round(decision.confidence * 100)}% confident</span>
            ) : (
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
