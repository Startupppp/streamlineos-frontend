"use client";

import { useState } from "react";
import {
  Settings2,
  Eye,
  EyeOff,
  LayoutGrid,
  AlignJustify,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UseHomeCustomisationResult, HomeDensity } from "./use-home-customisation";

export interface WidgetOption {
  id: string;
  label: string;
}

interface DensityButtonProps {
  value: HomeDensity;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  current: HomeDensity;
  onSelect: (value: HomeDensity) => void;
}

function DensityButton({ value, label, Icon, current, onSelect }: DensityButtonProps) {
  function handleClick() {
    onSelect(value);
  }

  return (
    <Button
      type="button"
      variant={current === value ? "secondary" : "ghost"}
      size="sm"
      onClick={handleClick}
      className="h-7 flex-1 gap-1.5 text-xs"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}

interface WidgetToggleRowProps {
  option: WidgetOption;
  isHidden: boolean;
  onToggle: (id: string) => void;
}

function WidgetToggleRow({ option, isHidden, onToggle }: WidgetToggleRowProps) {
  function handleToggle() {
    onToggle(option.id);
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-foreground">{option.label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={isHidden ? `Show ${option.label}` : `Hide ${option.label}`}
        onClick={handleToggle}
        className="h-7 w-7 p-0 shrink-0"
      >
        {isHidden ? (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

interface HomeCustomisationBarProps {
  customisation: UseHomeCustomisationResult;
  availableWidgets: readonly WidgetOption[];
}

export function HomeCustomisationBar({
  customisation,
  availableWidgets,
}: HomeCustomisationBarProps) {
  const [open, setOpen] = useState(false);
  const { state, toggleWidgetVisibility, setDensity, reset, isHidden } =
    customisation;
  const hiddenCount = state.hiddenWidgets.length;

  function handleOpenChange(value: boolean) {
    setOpen(value);
  }

  function handleReset() {
    reset();
  }

  return (
    <div className="flex items-center justify-end">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Customise Home layout"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Customise
            {hiddenCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                {hiddenCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Home layout
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                aria-label="Reset Home layout to defaults"
                className="h-6 gap-1 px-2 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Density</span>
              <div className="flex gap-1">
                <DensityButton
                  value="comfortable"
                  label="Comfortable"
                  Icon={LayoutGrid}
                  current={state.density}
                  onSelect={setDensity}
                />
                <DensityButton
                  value="compact"
                  label="Compact"
                  Icon={AlignJustify}
                  current={state.density}
                  onSelect={setDensity}
                />
              </div>
            </div>

            {availableWidgets.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Widgets</span>
                <div className="divide-y divide-border">
                  {availableWidgets.map((option) => (
                    <WidgetToggleRow
                      key={option.id}
                      option={option}
                      isHidden={isHidden(option.id)}
                      onToggle={toggleWidgetVisibility}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
