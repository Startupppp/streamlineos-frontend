"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Calendar, CheckCircle2, Clock, Gauge, Link2, MoreHorizontal, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { writeToClipboard } from "@/lib/clipboard";
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
  const href = `/build/${projectId}/cycles/${cycle.id}`;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canManage) return;
      event.preventDefault();
      setMenuOpen(true);
    },
    [canManage],
  );

  const handleCopyLink = useCallback(() => {
    const url =
      typeof window === "undefined" ? href : `${window.location.origin}${href}`;
    void writeToClipboard(url).then((copied) => {
      if (copied) toast.success("Link copied");
      else toast.error("Could not copy the link");
    });
  }, [href]);

  const handlePlan = useCallback(() => onPlan(cycle), [cycle, onPlan]);
  const handleEdit = useCallback(() => onEdit(cycle), [cycle, onEdit]);
  const handleStatus = useCallback(() => {
    if (cycle.status === "active") onComplete(cycle);
    else onChangeStatus(cycle);
  }, [cycle, onChangeStatus, onComplete]);
  const handleDelete = useCallback(() => onDelete(cycle), [cycle, onDelete]);

  return (
    <div
      onContextMenu={handleContextMenu}
      className={cn(
      "bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/50",
      isCompleted && "opacity-70 hover:opacity-100",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              className="min-w-0 truncate font-semibold text-sm hover:underline"
              href={href}
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
            {cycle.capacity !== null ? (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                <span className="tabular-nums">{cycle.capacity}</span> capacity
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!canManage ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={href} aria-label={`Open ${cycle.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${cycle.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={href}>
                    <ArrowRight /> Open
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleCopyLink}>
                  <Link2 /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handlePlan}>
                  <Calendar /> Plan work
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleEdit}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleStatus}>
                  <StatusIcon /> {statusAction}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
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
      {cycle.goal ? (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{cycle.goal}</p>
      ) : null}
    </div>
  );
}
