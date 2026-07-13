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
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  list: { icon: <List className="h-4 w-4" />, label: "List", color: "text-blue-600 bg-blue-50" },
  table: { icon: <LayoutGrid className="h-4 w-4" />, label: "Table", color: "text-emerald-600 bg-emerald-50" },
  calendar: { icon: <Calendar className="h-4 w-4" />, label: "Calendar", color: "text-amber-600 bg-amber-50" },
  gantt: { icon: <GitBranch className="h-4 w-4" />, label: "Gantt", color: "text-rose-600 bg-rose-50" },
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
      className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer mb-1.5 flex items-center justify-between gap-3"
      onClick={handleNavigate}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("shrink-0 h-8 w-8 rounded-md flex items-center justify-center", meta?.color ?? "text-muted-foreground bg-muted")}>
          {meta?.icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{view.name}</p>
          <p className="text-xs text-muted-foreground">
            {meta?.label ?? view.layoutType}
            {filterCount > 0 && ` · ${filterCount} filter${filterCount > 1 ? "s" : ""}`}
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
});
