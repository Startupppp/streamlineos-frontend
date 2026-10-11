"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  Map,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import type { GoalLevel, GoalListItem } from "@/hooks/api/goals";
import { LEVEL_LABEL, STATUS_CONFIG } from "./constants";
import { GoalCardActions } from "./goal-card-actions";

export const GOAL_LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];


const FRESHNESS_CONFIG = {
  fresh: {
    label: "Fresh",
    icon: CheckCircle2,
    className: "text-status-success-ink-strong",
  },
  stale: {
    label: "Stale check-in",
    icon: AlertCircle,
    className: "text-status-warning-ink-strong",
  },
  none: null,
} as const;

interface GoalCardProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
  onUnlink?: (goal: GoalListItem) => void;
  onCheckIn?: (goal: GoalListItem) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onUnlink, onCheckIn }: GoalCardProps) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = Boolean(onEdit || onDelete || onUnlink || onCheckIn);

  const freshnessCfg = FRESHNESS_CONFIG[goal.checkInFreshness];
  const FreshnessIcon = freshnessCfg?.icon ?? null;

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!hasActions) return;
      event.preventDefault();
      setMenuOpen(true);
    },
    [hasActions],
  );

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      onContextMenu={handleContextMenu}
    >
      <div className="group relative">
          <div
          className={cn(
            PM_PANEL,
            "flex flex-col gap-3 border-border/80 bg-card p-4 shadow-sm transition-[border-color,box-shadow] duration-200 group-hover:border-primary/40 group-hover:shadow-md",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {LEVEL_LABEL[goal.level]} objective
              </p>
              <Link
                href={`/build/goals/${goal.id}`}
                className="mt-1 block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <h3
                  className={cn(
                    TEXT_TWO_LINES,
                    "text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary",
                  )}
                  title={goal.title}
                >
                  {goal.title}
                </h3>
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {freshnessCfg && FreshnessIcon ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    freshnessCfg.className,
                  )}
                  title={`Check-in: ${freshnessCfg.label}`}
                >
                  <FreshnessIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{freshnessCfg.label}</span>
                </span>
              ) : null}
              <Badge variant={cfg.variant} className="shrink-0">
                {cfg.label}
              </Badge>
              {hasActions ? (
                <GoalCardActions
                  goal={goal}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUnlink={onUnlink}
                  onCheckIn={onCheckIn}
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                />
              ) : null}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {goal.progress}%
              </span>
            </div>
            <Progress
              value={goal.progress}
              className="h-1.5"
              aria-label={`${goal.title} progress`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/80 pt-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="mt-0.5 truncate text-sm text-foreground">{ownerName ?? "Unassigned"}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-xs text-muted-foreground">Key results</p>
              <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
                {goal.keyResultCount}
              </p>
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {goal.linkCount === 0
              ? "No linked initiatives"
              : `${goal.linkCount} linked (${goal.linkedProjectCount} project${goal.linkedProjectCount === 1 ? "" : "s"}, ${goal.linkedTicketCount} ticket${goal.linkedTicketCount === 1 ? "" : "s"})`}
          </p>

          {(goal.linkedRoadmapItemCount > 0 || goal.linkedOpportunityCount > 0) ? (
            <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
              {goal.linkedRoadmapItemCount > 0 ? (
                <span className="flex items-center gap-1">
                  <Map className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {goal.linkedRoadmapItemCount} roadmap item{goal.linkedRoadmapItemCount === 1 ? "" : "s"}
                </span>
              ) : null}
              {goal.linkedOpportunityCount > 0 ? (
                <span className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {goal.linkedOpportunityCount} opportunit{goal.linkedOpportunityCount === 1 ? "y" : "ies"}
                </span>
              ) : null}
            </div>
          ) : null}

          {goal.parentGoalId !== null ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Link
                href={`/build/goals/${goal.parentGoalId}`}
                className="hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Parent goal
              </Link>
            </div>
          ) : null}

          {goal.outcomeReviews != null ? (
            <Link
              href={`/build/goals/${goal.id}`}
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Outcome reviews
              </span>
              <span className="font-mono tabular-nums">
                {goal.outcomeReviews.completed}/{goal.outcomeReviews.scheduled}
                {goal.outcomeReviews.latestResult
                  ? ` · ${goal.outcomeReviews.latestResult}`
                  : ""}
              </span>
            </Link>
          ) : null}

          {goal.target !== null ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>KR total</span>
              <span className="tabular-nums font-mono">
                {goal.current ?? "0"} / {goal.target}
              </span>
            </div>
          ) : null}

          {goal.confidence !== null ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence</span>
              <span className="tabular-nums">{goal.confidence}%</span>
            </div>
          ) : null}

          {goal.dueDate ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Due {format(new Date(goal.dueDate), "MMM d, yyyy")}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
