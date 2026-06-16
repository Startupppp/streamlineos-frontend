"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";

export const PIE_COLORS = [
  "hsl(var(--chart-1, 221 83% 53%))",
  "hsl(var(--chart-2, 142 71% 45%))",
  "hsl(var(--chart-3, 262 80% 50%))",
  "hsl(var(--chart-4, 32 95% 50%))",
  "hsl(var(--chart-5, 0 72% 51%))",
  "hsl(var(--chart-6, 189 94% 43%))",
];

export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <EmptyLeaderboardIllustration className="h-28 w-28 opacity-80" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function SimpleBar({
  data,
}: {
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 truncate shrink-0">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${item.color ?? "bg-primary"}`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
