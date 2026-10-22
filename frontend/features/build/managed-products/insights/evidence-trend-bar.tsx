"use client";

import { BarChart, Bar, ResponsiveContainer } from "recharts";

function deriveTrendSummary(trend: { count: number }[]): string {
  const mid = Math.ceil(trend.length / 2);
  const firstHalf = trend.slice(0, mid).reduce((s, t) => s + t.count, 0);
  const secondHalf = trend.slice(mid).reduce((s, t) => s + t.count, 0);
  if (secondHalf > firstHalf * 1.1) return "Trending up";
  if (secondHalf < firstHalf * 0.9) return "Trending down";
  return "Stable";
}

interface TrendBarProps {
  trend: { count: number }[];
}

export function TrendBar({ trend }: TrendBarProps) {
  const data = trend.slice(-8).map((t) => ({ count: t.count }));
  if (trend.length === 0) {
    return <span className="text-xs text-muted-foreground" aria-label="No trend data">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-6 w-20" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={2} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="count" fill="var(--chart-1)" radius={[1, 1, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {trend.length >= 2 && (
        <span className="text-xs text-muted-foreground">{deriveTrendSummary(trend)}</span>
      )}
    </div>
  );
}
