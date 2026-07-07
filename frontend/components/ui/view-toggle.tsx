"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewOption<T extends string = string> {
  value: T;
  icon: LucideIcon;
  label: string;
}

interface ViewToggleProps<T extends string = string> {
  value: T;
  options: ViewOption<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "default";
  showLabel?: boolean;
  className?: string;
}

export function ViewToggle<T extends string = string>({
  value,
  options,
  onChange,
  size = "default",
  showLabel = false,
  className,
}: ViewToggleProps<T>) {
  const h = size === "sm" ? "h-7" : "h-8";
  const pad = size === "sm" ? "px-2" : "px-2.5";
  const labelPad = size === "sm" ? "px-2.5" : "px-3";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center justify-center rounded-md transition-all press-scale",
              showLabel && "gap-1.5 text-xs font-medium",
              h,
              showLabel ? labelPad : pad,
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={iconSize} />
            {showLabel ? opt.label : null}
          </button>
        );
      })}
    </div>
  );
}
