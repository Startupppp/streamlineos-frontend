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
  Pencil,
  ArrowRight,
} from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PM_ROW } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CARD_ACTIVATOR_CLASS } from "@/lib/keyboard-activation";

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
  list: { icon: <List className="h-4 w-4" />, label: "List", color: "text-status-info-ink bg-status-info-surface" },
  table: { icon: <LayoutGrid className="h-4 w-4" />, label: "Table", color: "text-status-success-ink bg-status-success-surface" },
  calendar: { icon: <Calendar className="h-4 w-4" />, label: "Calendar", color: "text-status-warning-ink bg-status-warning-surface" },
  gantt: { icon: <GitBranch className="h-4 w-4" />, label: "Gantt", color: "text-status-danger-ink bg-status-danger-surface" },
};

interface ViewCardProps {
  view: ViewItem;
  isPinned: boolean;
  currentUserId?: string;
  onNavigate: (view: ViewItem) => void;
  onTogglePin: (viewId: number, isPinned: boolean) => void;
  onRename: (view: ViewItem) => void;
  onDelete: (viewId: number) => void;
  canManage: boolean;
}

export const ViewCard = memo(function ViewCard({
  view,
  isPinned,
  currentUserId,
  onNavigate,
  onTogglePin,
  onRename,
  onDelete,
  canManage,
}: ViewCardProps) {
  const handleNavigate = useCallback(() => onNavigate(view), [onNavigate, view]);
  const handleStopPropagation = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation(),
    [],
  );
  const handleTogglePin = useCallback(
    () => onTogglePin(view.id, !isPinned),
    [onTogglePin, view.id, isPinned],
  );
  const handleRename = useCallback(() => onRename(view), [onRename, view]);
  const handleDelete = useCallback(() => onDelete(view.id), [onDelete, view.id]);

  const filterCount = view.filters ? Object.keys(view.filters).length : 0;
  const meta = LAYOUT_META[view.layoutType] ?? LAYOUT_META["board"];
  const isOwner = canManage && (!view.createdBy || view.createdBy === currentUserId);
  const isPrivate = view.visibility === "private";

  return (
    <div
      className={cn(PM_ROW, "relative cursor-pointer rounded-lg border-0 last:border-b-0")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", meta?.color ?? "bg-muted text-muted-foreground")}>
          {meta?.icon}
        </div>
        <button type="button" onClick={handleNavigate} className={cn("min-w-0", CARD_ACTIVATOR_CLASS)}>
          <TruncatedText text={view.name} className="text-sm font-medium" />
          <p className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}>
            {meta?.label ?? view.layoutType}
            {filterCount > 0 ? ` · ${filterCount} filter${filterCount > 1 ? "s" : ""}` : ""}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {isPinned && (
            <Badge variant="outline" className="text-micro bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
              Pinned
            </Badge>
          )}
          {isPrivate && (
            <Badge variant="outline" className="text-micro text-muted-foreground">
              Personal
            </Badge>
          )}
        </div>
      </div>
      <div
        className="relative z-10 flex items-center gap-1 shrink-0"
        onClick={handleStopPropagation}
        onKeyDown={handleStopPropagation}
      >
        {isOwner && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleTogglePin}>
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
        )}
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRename}
            aria-label="Rename saved view"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {isOwner && (
          <AnimatedIconButton
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete saved view"
            icon={Trash2Icon}
            iconSize={14}
          />
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
});
