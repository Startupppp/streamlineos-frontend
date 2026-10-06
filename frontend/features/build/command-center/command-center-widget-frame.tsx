"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WIDGET_SIZE_PRESETS, type WidgetSlot, type WidgetType } from "./dashboard-layout";
import { WIDGET_CATALOG } from "./widget-catalog";

export const WIDGET_DRAG_CLASS = "cc-widget-drag";
export const WIDGET_CONTROL_CLASS = "cc-widget-control";

interface CommandCenterWidgetFrameProps {
  slot: WidgetSlot;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (type: WidgetType) => void;
  onResize: (type: WidgetType, w: number) => void;
  onMove: (type: WidgetType, offset: -1 | 1) => void;
  children: ReactNode;
}

export function CommandCenterWidgetFrame({
  slot,
  editing,
  isFirst,
  isLast,
  onRemove,
  onResize,
  onMove,
  children,
}: CommandCenterWidgetFrameProps) {
  const { title, minW } = WIDGET_CATALOG[slot.type];
  const sizes = WIDGET_SIZE_PRESETS.filter((preset) => preset.w >= minW);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 min-w-0 flex-col",
        editing && cn(WIDGET_DRAG_CLASS, "rounded-xl outline-2 outline-offset-2 outline-dashed outline-primary/40 md:cursor-grab md:active:cursor-grabbing"),
      )}
      data-widget-type={slot.type}
    >
      {editing ? (
        <div
          className={cn(
            WIDGET_CONTROL_CLASS,
            "absolute inset-x-2 top-2 z-10 flex min-w-0 items-center gap-1 rounded-lg border border-border bg-background/95 py-1 pl-1.5 pr-1 shadow-sm backdrop-blur-sm",
          )}
        >
          <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{title}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Arrange ${title}`}>
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(slot.type, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
                Move earlier
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isLast} onSelect={() => onMove(slot.type, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
                Move later
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Width
              </DropdownMenuLabel>
              {sizes.map((preset) => (
                <DropdownMenuItem key={preset.w} onSelect={() => onResize(slot.type, preset.w)}>
                  <Check className={cn("h-3.5 w-3.5", slot.position.w === preset.w ? "opacity-100" : "opacity-0")} />
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(slot.type)}
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
