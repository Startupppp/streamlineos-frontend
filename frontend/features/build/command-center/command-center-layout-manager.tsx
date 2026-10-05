"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, X, RotateCcw } from "lucide-react";

interface CommandCenterLayoutPanelProps {
  widgetType: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: ReactNode;
}

export function CommandCenterLayoutPanel({
  widgetType,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: CommandCenterLayoutPanelProps) {
  return (
    <div className="relative group" data-widget-type={widgetType}>
      <div
        className="absolute -top-1 right-0 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={`Controls for ${widgetType} widget`}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${widgetType} widget up`}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={onMoveDown}
          disabled={index >= total - 1}
          aria-label={`Move ${widgetType} widget down`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={onRemove}
          aria-label={`Remove ${widgetType} widget`}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      {children}
    </div>
  );
}

interface LayoutResetButtonProps {
  onReset: () => void;
}

export function LayoutResetButton({ onReset }: LayoutResetButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onReset}
      className="text-muted-foreground"
      aria-label="Reset dashboard layout to default"
    >
      <RotateCcw className="h-3.5 w-3.5 mr-1" />
      Reset layout
    </Button>
  );
}
