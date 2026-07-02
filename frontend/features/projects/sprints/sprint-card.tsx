"use client";

import { useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { Target, Play, Square, MoreHorizontal, Pencil, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EditSprintDialog } from "@/features/projects/sprints/edit-sprint-dialog";

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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  PLANNED: {
    label: "Planned",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

export function SprintCard({ sprint, projectId, onStart, onComplete, onPlan, isUpdating }: SprintCardProps) {
  const tickets = sprint.tickets || [];
  const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tickets.filter((t) => t.status === "DONE").reduce((sum, t) => sum + (t.points || 0), 0);
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;
  const doneTickets = tickets.filter((t) => t.status === "DONE").length;

  const endDate = new Date(sprint.endDate);
  const startDate = new Date(sprint.startDate);
  const daysRemaining = differenceInDays(endDate, new Date());

  const statusStyle = STATUS_STYLES[sprint.status ?? "PLANNED"] ?? STATUS_STYLES["PLANNED"];

  const handleStart = useCallback(() => onStart?.(sprint.id), [sprint.id, onStart]);
  const handleComplete = useCallback(() => onComplete?.(sprint.id), [sprint.id, onComplete]);
  const handlePlan = useCallback(() => onPlan?.(sprint.id), [sprint.id, onPlan]);

  const daysLabel =
    sprint.status === "COMPLETED"
      ? "Done"
      : daysRemaining < 0
        ? `${Math.abs(daysRemaining)}d overdue`
        : `${daysRemaining}d left`;

  return (
    <div className="bg-card border border-border rounded-lg p-4 group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/projects/${projectId}?sprint=${sprint.id}`}
            className="font-semibold text-sm truncate hover:text-primary transition-colors"
          >
            {sprint.name}
          </Link>
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0", statusStyle.className)}>
            {statusStyle.label}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Sprint actions for ${sprint.name}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <EditSprintDialog
                sprint={sprint}
                projectId={projectId}
                trigger={
                  <button className="flex items-center w-full px-2 py-1.5 text-sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Sprint
                  </button>
                }
              />
            </DropdownMenuItem>
            {onPlan && (
              <DropdownMenuItem onClick={handlePlan}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Plan Sprint
              </DropdownMenuItem>
            )}
            {sprint.status === "PLANNED" && onStart && (
              <DropdownMenuItem onClick={handleStart} disabled={isUpdating}>
                <Play className="h-4 w-4 mr-2" />
                Start Sprint
              </DropdownMenuItem>
            )}
            {sprint.status === "ACTIVE" && onComplete && (
              <DropdownMenuItem onClick={handleComplete} disabled={isUpdating}>
                <Square className="h-4 w-4 mr-2" />
                Complete Sprint
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}?sprint=${sprint.id}`}>View Board</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sprint.goal && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
          <Target className="h-3 w-3 shrink-0" />
          <span className="truncate">{sprint.goal}</span>
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>
          {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
        </span>
        <span
          className={cn(
            sprint.status !== "COMPLETED" && daysRemaining < 0 && "text-red-500"
          )}
        >
          {daysLabel}
        </span>
      </div>

      <div className="mt-3">
        <div
          className="w-full bg-secondary rounded-full h-1.5"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} points`}
          aria-valuetext={`${Math.round(progress)}% complete`}
        >
          <div
            className="bg-gradient-to-r from-violet-600 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{completedPoints}/{totalPoints} pts</span>
          <span>{doneTickets}/{tickets.length} tickets</span>
        </div>
      </div>
    </div>
  );
}
