"use client";

import { Gauge } from "lucide-react";
import { PmPanel } from "@/components/pm-chrome";
import { formatNumber } from "@/lib/format-utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

export const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

export const AXIS_TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
} as const;

export const GRID_STROKE = "hsl(var(--border))";

export const CHART_BLUE = {
  200: "#bfdbfe",
  300: "#93c5fd",
  500: "#3b82f6",
  600: "#2563eb",
} as const;

export const numberFormatter = { format: (value: number) => formatNumber(value, "en-IN") };

export function ChartCard({
  title,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  icon: typeof Gauge;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PmPanel className="p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h3 className={cn("flex min-w-0 items-center gap-2 text-sm font-semibold", TEXT_ONE_LINE)}>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={TEXT_ONE_LINE}>{title}</span>
        </h3>
        {actions}
      </div>
      {children}
    </PmPanel>
  );
}
