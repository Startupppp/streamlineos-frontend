"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Link2 as LinkIcon,
  ListChecks,
  Map,
  Pencil,
  Target,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { GoalLevel, GoalListItem } from "@/hooks/api/goals";
import { LEVEL_LABEL, STATUS_CONFIG } from "./constants";

export const GOAL_LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

interface GoalCardActionsProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
  onUnlink?: (goal: GoalListItem) => void;
  onCheckIn?: (goal: GoalListItem) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GoalCardActions({
  goal,
  onEdit,
  onDelete,
  onUnlink,
  onCheckIn,
  open,
  onOpenChange,
}: GoalCardActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit?.(goal), [goal, onEdit]);
  const handleDelete = useCallback(() => onDelete?.(goal), [goal, onDelete]);
  const handleUnlink = useCallback(() => onUnlink?.(goal), [goal, onUnlink]);
  const handleCheckIn = useCallback(() => onCheckIn?.(goal), [goal, onCheckIn]);

  const hasProductActions = Boolean(onUnlink || onCheckIn);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Goal actions"
          className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {onCheckIn && goal.keyResultCount > 0 ? (
          <DropdownMenuItem onClick={handleCheckIn}>
            <ClipboardCheck className="h-4 w-4" />
            Check in
          </DropdownMenuItem>
        ) : null}
        {hasProductActions && (onEdit || onDelete) ? (
          <DropdownMenuSeparator />
        ) : null}
        {onUnlink ? (
          <DropdownMenuItem variant="destructive" onClick={handleUnlink}>
            <Unlink className="h-4 w-4 text-destructive" />
            Unlink from product
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const FRESHNESS_CONFIG = {
  fresh: {
    label: "Fresh",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  stale: {
    label: "Stale check-in",
    icon: AlertCircle,
    className: "text-amber-600 dark:text-amber-400",
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
            "space-y-3 border-border/80 bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md",
          )}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-micro font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
              {LEVEL_LABEL[goal.level]} objective
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {freshnessCfg && FreshnessIcon ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-micro font-medium",
                    freshnessCfg.className,
                  )}
                  title={`Check-in: ${freshnessCfg.label}`}
                >
                  <FreshnessIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {freshnessCfg.label}
                </span>
              ) : null}
              <Badge variant={cfg.variant} className="shrink-0 text-micro">
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

          <Link href={`/build/goals/${goal.id}`} className="block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <h3
                className={cn(
                  TEXT_TWO_LINES,
                  "text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary",
                )}
                title={goal.title}
              >
                {goal.title}
              </h3>
          </Link>

          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{goal.progress}%</span>
            </div>
            <Progress
              value={goal.progress}
              className="h-1.5"
              aria-label={`${goal.title} progress`}
            />
          </div>

          <div className="flex min-w-0 items-center justify-between text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <TruncatedText text={ownerName ?? "Unassigned"} />
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              {goal.keyResultCount} KR{goal.keyResultCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
            {goal.linkCount === 0 ? (
              <span>No linked initiatives</span>
            ) : (
              <span>
                {goal.linkCount} linked ({goal.linkedProjectCount} project
                {goal.linkedProjectCount === 1 ? "" : "s"},{" "}
                {goal.linkedTicketCount} ticket
                {goal.linkedTicketCount === 1 ? "" : "s"})
              </span>
            )}
          </div>

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

          {goal.outcomeReviews !== null ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
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
            </div>
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
