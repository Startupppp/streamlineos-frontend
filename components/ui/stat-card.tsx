"use client";

import Link from "next/link";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatColor =
  | "blue"
  | "cyan"
  | "green"
  | "red"
  | "violet"
  | "amber"
  | "gold"
  | "purple";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean; label?: string };
  href?: string;
  className?: string;
  index?: number;
  color?: StatColor;
}

const COLOR_MAP: Record<StatColor, { bg: string; icon: string; bar: string }> = {
  blue: { bg: "bg-blue-500/10", icon: "text-blue-600", bar: "bg-blue-500" },
  cyan: { bg: "bg-cyan-500/10", icon: "text-cyan-600", bar: "bg-cyan-500" },
  green: { bg: "bg-emerald-500/10", icon: "text-emerald-600", bar: "bg-emerald-500" },
  red: { bg: "bg-red-500/10", icon: "text-red-600", bar: "bg-red-500" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-600", bar: "bg-violet-500" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-600", bar: "bg-amber-500" },
  gold: { bg: "bg-blue-500/10", icon: "text-blue-600", bar: "bg-blue-500" },
  purple: { bg: "bg-violet-500/10", icon: "text-violet-600", bar: "bg-violet-500" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  className,
  index = 0,
  color = "blue",
}: StatCardProps) {
  const c = COLOR_MAP[color];

  const body = (
    <div
      className={cn(
        "relative group rounded-xl border border-border bg-card p-3.5 overflow-hidden transition-all duration-200",
        href &&
          "hover:border-blue-400 hover:shadow-[0_8px_24px_-8px_rgba(59,130,246,0.18)] hover:-translate-y-0.5 cursor-pointer",
        className,
      )}
      style={{ animation: `fade-up 0.3s ease-out ${index * 0.07}s both` }}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", c.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          <p
            className={cn(
              "font-semibold text-foreground mt-1 truncate leading-none",
              typeof value === "string" && value.length > 8 ? "text-lg" : "text-[1.375rem]",
            )}
          >
            {value}
          </p>

          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-[11px] font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600",
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-[11px] text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200",
            c.bg,
            href && "group-hover:scale-110",
          )}
        >
          <Icon className={cn("h-4 w-4", c.icon)} />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{body}</Link>;
  return body;
}
