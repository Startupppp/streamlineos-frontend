"use client";

import * as React from "react";
import { TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentColor =
  | "blue"
  | "cyan"
  | "emerald"
  | "amber"
  | "red"
  | "violet"
  | "slate";

const ACCENTS: Record<AccentColor, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", icon: "text-blue-600" },
  cyan: { bg: "bg-cyan-500/10", icon: "text-cyan-600" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-600" },
  red: { bg: "bg-red-500/10", icon: "text-red-600" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-600" },
  slate: { bg: "bg-slate-500/10", icon: "text-slate-600" },
};

interface MetricProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  accent?: AccentColor;
  trend?: { value: number; direction?: "up" | "down" | "flat" };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { value: "text-lg", icon: "h-7 w-7", iconSize: "h-3.5 w-3.5", padding: "p-3" },
  md: { value: "text-[1.375rem]", icon: "h-8 w-8", iconSize: "h-4 w-4", padding: "p-3.5" },
  lg: { value: "text-3xl", icon: "h-9 w-9", iconSize: "h-4 w-4", padding: "p-4" },
} as const;

export function Metric({
  label,
  value,
  hint,
  icon: Icon,
  accent = "blue",
  trend,
  size = "md",
  className,
}: MetricProps) {
  const c = ACCENTS[accent];
  const s = SIZES[size];

  const trendIcon =
    trend?.direction === "down"
      ? TrendingDown
      : trend?.direction === "flat"
        ? Minus
        : TrendingUp;
  const TrendIcon = trendIcon;
  const trendColor =
    trend?.direction === "down"
      ? "text-red-600"
      : trend?.direction === "flat"
        ? "text-muted-foreground"
        : "text-emerald-600";

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </p>
        <p
          className={cn(
            "font-semibold text-foreground mt-1 truncate leading-none",
            s.value,
          )}
        >
          {value}
        </p>
        {(hint || trend) && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            {trend && (
              <span className={cn("inline-flex items-center gap-0.5 font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {hint && <span className="text-muted-foreground truncate">{hint}</span>}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={cn(
            "rounded-lg flex items-center justify-center shrink-0",
            s.icon,
            c.bg,
          )}
        >
          <Icon className={cn(s.iconSize, c.icon)} />
        </div>
      )}
    </div>
  );
}
