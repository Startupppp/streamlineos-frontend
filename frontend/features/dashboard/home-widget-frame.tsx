"use client";

import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const HOME_WIDGET_DRAG_CLASS = "home-widget-drag";
export const HOME_WIDGET_CONTROL_CLASS = "home-widget-control";

interface HomeWidgetFrameProps {
  id: string;
  label: string;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, offset: -1 | 1) => void;
  children: ReactNode;
}

export function HomeWidgetFrame({
  id,
  label,
  editing,
  isFirst,
  isLast,
  onRemove,
  onMove,
  children,
}: HomeWidgetFrameProps) {
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);
  const handleMoveKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp" && !isFirst) {
        event.preventDefault();
        onMove(id, -1);
      }
      if (event.key === "ArrowDown" && !isLast) {
        event.preventDefault();
        onMove(id, 1);
      }
    },
    [id, isFirst, isLast, onMove],
  );

  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 min-w-0 flex-col",
        editing && "rounded-xl outline-2 outline-offset-2 outline-dashed outline-primary/40",
      )}
      data-widget-id={id}
    >
      {editing ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background/95 p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity max-md:pointer-events-auto max-md:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              HOME_WIDGET_DRAG_CLASS,
              "h-7 w-7 shrink-0 cursor-grab p-0 text-muted-foreground active:cursor-grabbing",
            )}
            onKeyDown={handleMoveKeyDown}
            aria-label={`Move ${label} widget`}
            aria-keyshortcuts="ArrowUp ArrowDown"
            title="Drag to move. Use the up and down arrow keys to reorder."
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              HOME_WIDGET_CONTROL_CLASS,
              "h-7 w-7 p-0 text-muted-foreground hover:text-destructive",
            )}
            onClick={handleRemove}
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
      <div
        className={cn("min-h-0 flex-1 overflow-auto", editing && "pointer-events-none select-none")}
        inert={editing ? true : undefined}
      >
        {children}
      </div>
    </div>
  );
}
