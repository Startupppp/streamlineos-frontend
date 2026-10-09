"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Link2 as LinkIcon,
  ListChecks,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { GoalLevel, GoalListItem } from "@/hooks/api/goals";
import { STATUS_CONFIG } from "./constants";

export const GOAL_LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

interface GoalCardActionsProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GoalCardActions({
  goal,
  onEdit,
  onDelete,
  open,
  onOpenChange,
}: GoalCardActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit?.(goal), [goal, onEdit]);
  const handleDelete = useCallback(() => onDelete?.(goal), [goal, onDelete]);

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
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GoalCardProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = Boolean(onEdit || onDelete);

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
            "space-y-3 p-4 transition-[border-color,box-shadow] duration-200 group-hover:border-primary/40 group-hover:shadow-md",
          )}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <Link href={`/build/goals/${goal.id}`} className="min-w-0 flex-1">
              <p
                className={cn(
                  TEXT_TWO_LINES,
                  "text-sm font-medium leading-snug",
                )}
                title={goal.title}
              >
                {goal.title}
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant={cfg.variant} className="shrink-0 text-micro">
                {cfg.label}
              </Badge>
              {hasActions ? (
                <GoalCardActions
                  goal={goal}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{goal.progress}%</span>
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
