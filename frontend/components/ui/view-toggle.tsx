"use client";

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
  showLabel = false,
  className,
}: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = opt.value === value;

        function handleClick() {
          onChange(opt.value);
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={handleClick}
            aria-label={opt.label}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2.5 py-1.5 leading-none transition-colors press-scale outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
              showLabel && "gap-1.5 px-3 text-sm font-medium",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {showLabel ? opt.label : null}
          </button>
        );
      })}
    </div>
  );
}
