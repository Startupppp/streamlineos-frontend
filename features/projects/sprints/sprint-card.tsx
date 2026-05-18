"use client";

import { useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { Target, Play, Square, MoreHorizontal, Pencil, ArrowLeftRight, CalendarDays, Timer, ListChecks, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EditSprintDialog } from "@/components/projects/edit-sprint-dialog";

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

const STATUS_INFO: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  PLANNED: { label: "Planned", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

export function SprintCard({ sprint, projectId, onStart, onComplete, onPlan, isUpdating }: SprintCardProps) {
  const tickets = sprint.tickets || [];
  const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tickets.filter((t) => t.status === "DONE").reduce((sum, t) => sum + (t.points || 0), 0);
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  const endDate = new Date(sprint.endDate);
  const startDate = new Date(sprint.startDate);
  const daysRemaining = differenceInDays(endDate, new Date());
  const totalDays = differenceInDays(endDate, startDate);

  const statusInfo = STATUS_INFO[sprint.status || "PLANNED"] ?? { label: sprint.status || "PLANNED", variant: "secondary" as const };

  const handleStart = useCallback(() => onStart?.(sprint.id), [sprint.id, onStart]);
  const handleComplete = useCallback(() => onComplete?.(sprint.id), [sprint.id, onComplete]);
  const handlePlan = useCallback(() => onPlan?.(sprint.id), [sprint.id, onPlan]);
  const doneTickets = tickets.filter((t) => t.status === "DONE").length;

  return (
    <Card className="rounded-xl border-border/80 bg-card/80 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <Link
                href={`/projects/${projectId}?sprint=${sprint.id}`}
                className="hover:text-primary transition-colors truncate"
              >
                {sprint.name}
              </Link>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </CardTitle>
            {sprint.goal && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                <span className="truncate">{sprint.goal}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Sprint actions for ${sprint.name}`}>
                <MoreHorizontal className="h-4 w-4" />
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
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Start Date
            </p>
            <p className="font-medium">{format(startDate, "MMM dd, yyyy")}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              End Date
            </p>
            <p className="font-medium">{format(endDate, "MMM dd, yyyy")}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Duration
            </p>
            <p className="font-medium">{totalDays} days</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              {sprint.status === "COMPLETED" ? "Completed" : "Remaining"}
            </p>
            <p className={cn("font-medium", sprint.status !== "COMPLETED" && daysRemaining < 0 && "text-red-500")}>
              {sprint.status === "COMPLETED"
                ? "Done"
                : daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days`}
            </p>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-2">
            <span className="text-muted-foreground">
              Progress: <span className="font-medium text-foreground">{completedPoints} / {totalPoints}</span> points
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{doneTickets} / {tickets.length}</span> tickets
            </span>
          </div>
          <div
            className="w-full bg-secondary rounded-full h-2.5"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} points`}
            aria-valuetext={`${Math.round(progress)}% complete`}
          >
            <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
