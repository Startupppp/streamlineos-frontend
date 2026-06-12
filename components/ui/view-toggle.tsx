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
  className?: string;
}

/**
 * Segmented control for switching between display modes (grid / list / card etc).
 * Renders as a single bordered pill where the active segment uses primary ink.
 */
export function ViewToggle<T extends string = string>({
  value,
  options,
  onChange,
  size = "default",
  className,
}: ViewToggleProps<T>) {
  const h = size === "sm" ? "h-7" : "h-8";
  const pad = size === "sm" ? "px-2" : "px-2.5";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-card p-0.5",
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
              "inline-flex items-center justify-center rounded-sm transition-colors press-scale",
              h,
              pad,
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(11,18,32,0.25)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Icon className={iconSize} />
          </button>
        );
      })}
    </div>
  );
}
