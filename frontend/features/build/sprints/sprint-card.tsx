"use client";

import { memo, useCallback, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { Target, Play, Square, Pencil, ArrowLeftRight } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EditSprintDialog } from "@/features/build/sprints/edit-sprint-dialog";
import { PM_PANEL } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface SprintData {
  id: number;
  name: string;
  status: string | null;
  startDate: Date | string;
  endDate: Date | string;
  goal?: string | null;
  tickets?: Array<{
    id: number;
    title?: string;
    status: string | null;
    points: number | null;
    type?: string | null;
    priority?: string | null;
    ticketNumber?: number | null;
    assigneeId?: string | null;
    assignee?: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  }>;
}

interface SprintCardProps {
  sprint: SprintData;
  projectId: number;
  onStart?: (id: number) => void;
  onComplete?: (id: number) => void;
  onPlan?: (id: number) => void;
  isUpdating?: boolean;
}

interface StatusStyle {
  label: string;
  dotClassName: string;
  badgeClassName: string;
  stripeClassName: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  ACTIVE: {
    label: "Active",
    dotClassName: "bg-status-success-fill",
    badgeClassName: "bg-status-success-surface text-status-success-ink",
    stripeClassName: "border-l-emerald-500",
  },
  PLANNED: {
    label: "Planned",
    dotClassName: "bg-primary/60",
    badgeClassName: "bg-muted text-muted-foreground",
    stripeClassName: "border-l-primary/35",
  },
  COMPLETED: {
    label: "Completed",
    dotClassName: "bg-muted-foreground/40",
    badgeClassName: "bg-muted text-muted-foreground",
    stripeClassName: "border-l-muted-foreground/25",
  },
};

export const SprintCard = memo(function SprintCard({ sprint, projectId, onStart, onComplete, onPlan, isUpdating }: SprintCardProps) {
  const { tickets, totalPoints, completedPoints, progress, doneTickets } = useMemo(() => {
    const tix = sprint.tickets ?? [];
    let total = 0, completed = 0, done = 0;
    for (const t of tix) {
      const pts = t.points || 0;
      total += pts;
      if (t.status === "DONE") { completed += pts; done++; }
    }
    return {
      tickets: tix,
      totalPoints: total,
      completedPoints: completed,
      progress: total > 0 ? (completed / total) * 100 : 0,
      doneTickets: done,
    };
  }, [sprint.tickets]);

  const endDate = new Date(sprint.endDate);
  const startDate = new Date(sprint.startDate);
  const daysRemaining = differenceInDays(endDate, new Date());

  const statusStyle = STATUS_STYLES[sprint.status ?? "PLANNED"] ?? STATUS_STYLES["PLANNED"];

  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleStart = useCallback(() => onStart?.(sprint.id), [sprint.id, onStart]);
  const handleComplete = useCallback(() => onComplete?.(sprint.id), [sprint.id, onComplete]);
  const handlePlan = useCallback(() => onPlan?.(sprint.id), [sprint.id, onPlan]);

  const daysLabel =
    sprint.status === "COMPLETED"
      ? "Done"
      : daysRemaining < 0
        ? `${Math.abs(daysRemaining)}d overdue`
        : `${daysRemaining}d left`;

  const isOverdue = sprint.status !== "COMPLETED" && daysRemaining < 0;

  return (
    <div
      className={cn(
        PM_PANEL,
        "group relative overflow-hidden border-l-[3px] p-2.5",
        "transition-[border-color,box-shadow,background-color] duration-200 ease-out motion-reduce:transition-none",
        "hover:border-primary/40 hover:shadow-md hover:bg-card/60",
        statusStyle.stripeClassName,
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <div className="flex min-w-0 flex-1">
              <Link
                href={`/build/${projectId}?sprint=${sprint.id}`}
                className="flex-1 min-w-0 text-label font-semibold leading-tight text-foreground transition-colors hover:text-primary"
              >
                <TruncatedText text={sprint.name} />
              </Link>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 gap-0.5 rounded-full border-0 px-1.5 py-0 text-micro font-semibold uppercase tracking-wide",
                statusStyle.badgeClassName,
              )}
            >
              <span className={cn("h-1 w-1 shrink-0 rounded-full", statusStyle.dotClassName)} aria-hidden="true" />
              {statusStyle.label}
            </Badge>
          </div>

          {sprint.goal ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-micro text-muted-foreground">
              <Target className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              <TruncatedText text={sprint.goal} />
            </p>
          ) : null}

          <p className="mt-1 text-micro tabular-nums text-muted-foreground">
            {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0 opacity-100 transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              aria-label={`Sprint actions for ${sprint.name}`}
              {...hoverHandlers}
            >
              <EllipsisIcon ref={iconRef} size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <EditSprintDialog
                sprint={sprint}
                projectId={projectId}
                trigger={
                  <button className="flex w-full items-center px-2 py-1.5 text-sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Sprint
                  </button>
                }
              />
            </DropdownMenuItem>
            {onPlan ? (
              <DropdownMenuItem onClick={handlePlan}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Plan Sprint
              </DropdownMenuItem>
            ) : null}
            {sprint.status === "PLANNED" && onStart ? (
              <DropdownMenuItem onClick={handleStart} disabled={isUpdating}>
                <Play className="mr-2 h-4 w-4" />
                Start Sprint
              </DropdownMenuItem>
            ) : null}
            {sprint.status === "ACTIVE" && onComplete ? (
              <DropdownMenuItem onClick={handleComplete} disabled={isUpdating}>
                <Square className="mr-2 h-4 w-4" />
                Complete Sprint
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href={`/build/${projectId}?sprint=${sprint.id}`}>View Board</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-1.5 space-y-1 border-t border-border/50 pt-1.5">
        <div
          className="h-1 overflow-hidden rounded-full bg-muted/80"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} points`}
          aria-valuetext={`${Math.round(progress)}% complete`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
              progress >= 100 ? "bg-status-success-fill" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1.5 text-micro font-medium tabular-nums text-muted-foreground">
          <span className="min-w-0 truncate">
            {completedPoints}/{totalPoints} pts
            <span className="mx-1 text-border" aria-hidden="true">
              ·
            </span>
            {doneTickets}/{tickets.length} tickets
          </span>
          <span className={cn("shrink-0", isOverdue && "text-status-danger-ink")}>
            {daysLabel}
          </span>
        </div>
      </div>
    </div>
  );
});
