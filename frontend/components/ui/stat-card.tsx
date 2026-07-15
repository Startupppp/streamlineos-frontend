"use client";

import Link from "next/link";
import { memo, type ComponentType, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "accent" | "emerald" | "amber" | "red" | "blue" | "violet";

export type StatColor = StatTone | "cyan" | "green" | "gold" | "purple";

const TONE_MAP: Record<StatTone, { bg: string; text: string }> = {
  default: { bg: "bg-muted", text: "text-muted-foreground" },
  accent: { bg: "bg-primary/10", text: "text-primary" },
  blue: { bg: "bg-primary/10", text: "text-primary" },
  violet: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  red: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

const COLOR_TONE: Partial<Record<StatColor, StatTone>> = {
  cyan: "accent",
  green: "emerald",
  gold: "amber",
  purple: "accent",
};

function resolveTone(tone?: StatTone, color?: StatColor): StatTone {
  if (tone) return tone;
  if (!color) return "default";
  if (color in TONE_MAP) return color as StatTone;
  return COLOR_TONE[color] ?? "default";
}

function StatSparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 text-primary" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
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
  featured?: boolean;
  className?: string;
  index?: number;
  trend?: { value: number; isPositive: boolean; label?: string };
  subtitle?: string;
  sparkData?: number[];
  sparkColor?: string;
}

export interface StatCardGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export interface StatCardGridSkeletonProps {
  cols?: 2 | 3 | 4 | 5 | 6;
  count?: number;
  className?: string;
}

export function StatCardGrid({ children, cols: _cols = 4, className }: StatCardGridProps) {
  return (
    <div
      className={cn(
        "flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-px pb-0.5",
        "[&>*]:min-w-[148px] [&>*]:max-w-[220px] [&>*]:flex-1 [&>*]:shrink-0 [&>*]:snap-start [&>*]:basis-[148px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCardGridSkeleton({ cols = 4, count, className }: StatCardGridSkeletonProps) {
  const itemCount = count ?? cols;
  return (
    <StatCardGrid cols={cols} className={className}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <StatCard key={i} label="—" value="—" isLoading />
      ))}
    </StatCardGrid>
  );
}

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  color,
  delta,
  hint,
  href,
  isLoading,
  featured,
  className,
  index: _index,
  trend,
  subtitle,
  sparkData,
  sparkColor = "var(--primary)",
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
        "flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-colors",
        featured && "border-primary bg-primary text-primary-foreground",
        href && "hover:bg-muted/30 cursor-pointer",
        featured && href && "hover:bg-primary/90",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
            featured ? "bg-primary-foreground/15" : t.bg,
          )}
        >
          <Icon className={cn("h-4 w-4", featured ? "text-primary-foreground" : t.text)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[11px] font-medium truncate",
            featured ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {isLoading ? (
          <Skeleton className={cn("h-5 w-14 mt-0.5", featured && "bg-primary-foreground/20")} />
        ) : (
          <p
            className={cn(
              "text-lg font-semibold tabular-nums leading-tight",
              featured ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {value}
          </p>
        )}
        {!isLoading && effectiveDelta && (
          <p
            className={cn(
              "text-[10px] font-medium",
              effectiveDelta.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {effectiveDelta.direction === "up" ? "↑" : "↓"} {effectiveDelta.value}
          </p>
        )}
        {!isLoading && !effectiveDelta && effectiveHint && (
          <p className={cn("text-[10px] truncate", featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {effectiveHint}
          </p>
        )}
      </div>
      {!isLoading && sparkData && sparkData.length > 1 ? (
        <StatSparkLine data={sparkData} color={sparkColor} />
      ) : null}
    </div>
  );

  if (href) return <Link href={href}>{body}</Link>;
  return body;
});
