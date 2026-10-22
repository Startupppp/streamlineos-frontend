"use client";

import { useCallback, useState } from "react";
import { Check, CircleHelp, LayoutGrid, Plus, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HomeDensity, UseHomeCustomisationResult } from "./use-home-customisation";

export interface WidgetOption {
  id: string;
  label: string;
}

interface HomeCustomisationBarProps {
  customisation: UseHomeCustomisationResult;
  availableWidgets: readonly WidgetOption[];
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

function DensityButton({
  value,
  label,
  current,
  onSelect,
}: {
  value: HomeDensity;
  label: string;
  current: HomeDensity;
  onSelect: (value: HomeDensity) => void;
}) {
  const handleClick = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <Button
      type="button"
      variant={current === value ? "secondary" : "ghost"}
      size="sm"
      onClick={handleClick}
      className="h-9 px-2 text-xs"
    >
      {label}
    </Button>
  );
}

export function HomeCustomisationBar({
  customisation,
  availableWidgets,
  editing,
  onEditingChange,
}: HomeCustomisationBarProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const { state, toggleWidgetVisibility, setDensity, reset } = customisation;
  const hiddenCount = state.hiddenWidgets.length;
  const hidden = new Set(state.hiddenWidgets);
  const remaining = availableWidgets.filter((widget) => hidden.has(widget.id)).length;

  const handleStart = useCallback(() => onEditingChange(true), [onEditingChange]);
  const handleDone = useCallback(() => onEditingChange(false), [onEditingChange]);
  const handleOpenReset = useCallback(() => setConfirmResetOpen(true), []);
  const handleAdd = useCallback(
    (id: string) => {
      if (!hidden.has(id)) return;
      toggleWidgetVisibility(id);
      setAddOpen(false);
    },
    [hidden, toggleWidgetVisibility],
  );

  if (!editing) {
    return (
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Customise Home layout"
          className="h-9 gap-1.5"
          onClick={handleStart}
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          Customise
          {hiddenCount > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-micro">
              {hiddenCount}
            </Badge>
          ) : null}
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 rounded-xl border border-border bg-background/95 p-1 shadow-sm backdrop-blur-sm sm:w-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="How to arrange widgets">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-64 text-xs">
            Drag a widget by its handle. On larger screens, pull an edge to resize it.
            The other widgets move in to fill the gap.
          </TooltipContent>
        </Tooltip>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" aria-label="Add widget">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add widget</span>
              {remaining > 0 ? (
                <span className="hidden rounded bg-muted px-1.5 text-micro text-muted-foreground sm:inline">
                  {remaining}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-1">
            <ul className="flex flex-col" aria-label="Available widgets">
              {availableWidgets.map((widget) => {
                const placed = !hidden.has(widget.id);
                return (
                  <li key={widget.id}>
                    <button
                      type="button"
                      disabled={placed}
                      onClick={() => handleAdd(widget.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                        "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent",
                      )}
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 font-medium">{widget.label}</span>
                      {placed ? (
                        <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Added
                        </span>
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-1" role="group" aria-label="Density">
          <DensityButton value="comfortable" label="Comfortable" current={state.density} onSelect={setDensity} />
          <DensityButton value="compact" label="Compact" current={state.density} onSelect={setDensity} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground"
          onClick={handleOpenReset}
          aria-label="Reset Home layout to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button type="button" size="sm" className="h-9 gap-1.5" onClick={handleDone} aria-label="Finish customizing">
          <Check className="h-3.5 w-3.5" />
          Done
        </Button>
        <ConfirmDialog
          open={confirmResetOpen}
          onOpenChange={setConfirmResetOpen}
          title="Reset your Home layout?"
          description="Restore the default order, sizes, and visible widgets."
          confirmLabel="Reset layout"
          destructive
          onConfirm={reset}
        />
      </div>
    </TooltipProvider>
  );
}
