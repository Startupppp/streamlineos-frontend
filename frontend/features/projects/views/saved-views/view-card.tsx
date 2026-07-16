"use client";

import { memo, useCallback } from "react";
import {
  LayoutGrid,
  List,
  Kanban,
  Calendar,
  GitBranch,
  Pin,
  PinOff,
  ArrowRight,
} from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PM_ROW } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

export interface ViewItem {
  id: number;
  name: string;
  layoutType: string;
  isPinned: boolean;
  filters?: Record<string, unknown> | null;
  visibility?: "private" | "shared";
  createdBy?: string;
}

const LAYOUT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  board: { icon: <Kanban className="h-4 w-4" />, label: "Board", color: "text-muted-foreground bg-muted" },
  list: { icon: <List className="h-4 w-4" />, label: "List", color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10" },
  table: { icon: <LayoutGrid className="h-4 w-4" />, label: "Table", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" },
  calendar: { icon: <Calendar className="h-4 w-4" />, label: "Calendar", color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10" },
  gantt: { icon: <GitBranch className="h-4 w-4" />, label: "Gantt", color: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10" },
};

interface ViewCardProps {
  view: ViewItem;
  isPinned: boolean;
  currentUserId?: string;
  onNavigate: (view: ViewItem) => void;
  onTogglePin: (viewId: number, isPinned: boolean) => void;
  onDelete: (viewId: number) => void;
}

export const ViewCard = memo(function ViewCard({
  view,
  isPinned,
  currentUserId,
  onNavigate,
  onTogglePin,
  onDelete,
}: ViewCardProps) {
  const handleNavigate = useCallback(() => onNavigate(view), [onNavigate, view]);
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleTogglePin = useCallback(
    () => onTogglePin(view.id, !isPinned),
    [onTogglePin, view.id, isPinned],
  );
  const handleDelete = useCallback(() => onDelete(view.id), [onDelete, view.id]);

  const filterCount = view.filters ? Object.keys(view.filters).length : 0;
  const meta = LAYOUT_META[view.layoutType] ?? LAYOUT_META["board"];
  const isOwner = !view.createdBy || !currentUserId || view.createdBy === currentUserId;
  const isPrivate = view.visibility === "private";

  return (
    <div
      className={cn(PM_ROW, "cursor-pointer rounded-lg border-0 last:border-b-0")}
      onClick={handleNavigate}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", meta?.color ?? "bg-muted text-muted-foreground")}>
          {meta?.icon}
        </div>
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>{view.name}</p>
          <p className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}>
            {meta?.label ?? view.layoutType}
            {filterCount > 0 ? ` · ${filterCount} filter${filterCount > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPinned && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
              Pinned
            </Badge>
          )}
          {isPrivate && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Personal
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={handleStopPropagation}>
        {isOwner && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleTogglePin}>
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
        )}
        {isOwner && (
          <AnimatedIconButton
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleDelete}
            icon={Trash2Icon}
            iconSize={14}
          />
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
});
