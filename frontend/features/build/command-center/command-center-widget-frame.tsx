"use client";

import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetSlot, WidgetType } from "./dashboard-layout";
import { WIDGET_CATALOG } from "./widget-catalog";

export const WIDGET_DRAG_CLASS = "cc-widget-drag";
export const WIDGET_CONTROL_CLASS = "cc-widget-control";

interface CommandCenterWidgetFrameProps {
  slot: WidgetSlot;
  editing: boolean;
  onRemove: (type: WidgetType) => void;
  onMove: (type: WidgetType, offset: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
}

export function CommandCenterWidgetFrame({
  slot,
  editing,
  onRemove,
  onMove,
  isFirst,
  isLast,
  children,
}: CommandCenterWidgetFrameProps) {
  const { title } = WIDGET_CATALOG[slot.type];
  const handleRemove = useCallback(() => onRemove(slot.type), [onRemove, slot.type]);
  const handleMoveKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp" && !isFirst) {
        event.preventDefault();
        onMove(slot.type, -1);
      }
      if (event.key === "ArrowDown" && !isLast) {
        event.preventDefault();
        onMove(slot.type, 1);
      }
    },
    [isFirst, isLast, onMove, slot.type],
  );

  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 min-w-0 flex-col",
        editing && "rounded-xl outline-2 outline-offset-2 outline-dashed outline-primary/40",
      )}
      data-widget-type={slot.type}
    >
      {editing ? (
        <div
          className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background/95 p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity max-md:pointer-events-auto max-md:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(WIDGET_DRAG_CLASS, "h-7 w-7 shrink-0 cursor-grab p-0 text-muted-foreground active:cursor-grabbing")}
            onKeyDown={handleMoveKeyDown}
            aria-label={`Move ${title} widget`}
            aria-keyshortcuts="ArrowUp ArrowDown"
            title="Drag to move. Use the up and down arrow keys to reorder."
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(WIDGET_CONTROL_CLASS, "h-7 w-7 p-0 text-muted-foreground hover:text-destructive")}
            onClick={handleRemove}
            aria-label={`Remove ${title}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", editing && "pointer-events-none select-none")} inert={editing}>
        {children}
      </div>
    </div>
  );
}
