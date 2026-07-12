"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

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

export const numberFormatter = new Intl.NumberFormat("en-IN");

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
    <Card className="bg-card border border-border rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {actions}
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </Card>
  );
}
