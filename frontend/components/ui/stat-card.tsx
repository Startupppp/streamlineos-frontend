"use client";

import Link from "next/link";
import { type ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "blue" | "emerald" | "amber" | "red" | "violet";

export type StatColor = StatTone | "cyan" | "green" | "gold" | "purple";

const TONE_MAP: Record<StatTone, { bg: string; text: string }> = {
  default: { bg: "bg-slate-100",  text: "text-slate-600" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
  red:     { bg: "bg-red-50",     text: "text-red-600" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
};

const COLOR_TONE: Partial<Record<StatColor, StatTone>> = {
  cyan:   "blue",
  green:  "emerald",
  gold:   "amber",
  purple: "violet",
};

function resolveTone(tone?: StatTone, color?: StatColor): StatTone {
  if (tone) return tone;
  if (!color) return "default";
  if (color in TONE_MAP) return color as StatTone;
  return COLOR_TONE[color] ?? "default";
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatTone;
  color?: StatColor;
  delta?: { value: string; direction: "up" | "down" };
  hint?: string;
  href?: string;
  isLoading?: boolean;
  className?: string;
  index?: number;
  trend?: { value: number; isPositive: boolean; label?: string };
  subtitle?: string;
}

export interface StatCardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export function StatCardGrid({ children, cols = 4, className }: StatCardGridProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-px pb-1",
        "[&>*]:min-w-[150px] [&>*]:snap-start [&>*]:shrink-0",
        "sm:grid sm:overflow-visible sm:snap-none sm:pb-0 sm:mx-0",
        "sm:[&>*]:min-w-0 sm:[&>*]:shrink",
        GRID_COLS[cols],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  color,
  delta,
  hint,
  href,
  isLoading,
  className,
  index: _index,
  trend,
  subtitle,
}: StatCardProps) {
  const t = TONE_MAP[resolveTone(tone, color)];

  const effectiveHint = hint ?? subtitle;

  const effectiveDelta: { value: string; direction: "up" | "down" } | undefined =
    delta ??
    (trend
      ? {
          value: `${Math.abs(trend.value)}%${trend.label ? ` ${trend.label}` : ""}`,
          direction: trend.isPositive ? "up" : "down",
        }
      : undefined);

  const body = (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors",
        href && "hover:bg-muted/30 cursor-pointer",
        className,
      )}
    >
      {Icon && (
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", t.bg)}>
          <Icon className={cn("h-4 w-4", t.text)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
        {isLoading ? (
          <Skeleton className="h-5 w-14 mt-0.5" />
        ) : (
          <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">{value}</p>
        )}
        {!isLoading && effectiveDelta && (
          <p
            className={cn(
              "text-[10px] font-medium",
              effectiveDelta.direction === "up" ? "text-emerald-600" : "text-red-600",
            )}
          >
            {effectiveDelta.direction === "up" ? "↑" : "↓"} {effectiveDelta.value}
          </p>
        )}
        {!isLoading && !effectiveDelta && effectiveHint && (
          <p className="text-[10px] text-muted-foreground truncate">{effectiveHint}</p>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{body}</Link>;
  return body;
}
