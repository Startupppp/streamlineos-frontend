"use client";

import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock, MoreHorizontal, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Cycle } from "@/types/projects";

interface CycleCardProps {
  cycle: Cycle;
  projectId: number;
  canManage: boolean;
  onEdit: (cycle: Cycle) => void;
  onChangeStatus: (cycle: Cycle) => void;
  onPlan: (cycle: Cycle) => void;
  onComplete: (cycle: Cycle) => void;
  onDelete: (cycle: Cycle) => void;
}

export function CycleCard({
  cycle,
  projectId,
  canManage,
  onEdit,
  onChangeStatus,
  onPlan,
  onComplete,
  onDelete,
}: CycleCardProps) {
  const isActive = cycle.status === "active";
  const isCompleted = cycle.status === "completed";
  const statusAction = isCompleted ? "Reopen" : isActive ? "Complete" : "Start";
  const StatusIcon = isCompleted ? RotateCcw : isActive ? CheckCircle2 : Play;

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/50",
      isCompleted && "opacity-70 hover:opacity-100",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              className="min-w-0 truncate font-semibold text-sm hover:underline"
              href={`/build/${projectId}/cycles/${cycle.id}`}
              title={cycle.name}
            >
              {cycle.name}
            </Link>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn("shrink-0 capitalize", isActive && "bg-status-success-surface text-status-success-ink-strong")}
            >
              {cycle.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {isActive ? <Calendar className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {formatShortDate(cycle.startDate)} — {formatShortDate(cycle.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {cycle.completedItems ?? 0}/{cycle.totalItems ?? 0} done
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!canManage ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/build/${projectId}/cycles/${cycle.id}`} aria-label={`Open ${cycle.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${cycle.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onPlan(cycle)}>
                  <Calendar /> Plan work
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(cycle)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => cycle.status === "active" ? onComplete(cycle) : onChangeStatus(cycle)}>
                  <StatusIcon /> {statusAction}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(cycle)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {isActive ? (
        <div className="mt-3">
          <div
            className="w-full bg-muted rounded-full h-1.5"
            role="progressbar"
            aria-valuenow={cycle.progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Cycle progress: ${cycle.progress ?? 0}%`}
          >
            <div
              className="bg-status-success-fill h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${cycle.progress ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">
            {cycle.progress ?? 0}% complete
          </span>
        </div>
      ) : null}
    </div>
  );
}
