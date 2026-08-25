"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { LeaveBalance } from "./leaves-shared";
import { TruncatedText } from "@/components/ui/truncated-text";

const DONUT_COLORS = ["#06b6d4", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];

export function LeaveBalanceDonut({ balances, allowedNames }: { balances: LeaveBalance[]; allowedNames: Set<string> }) {
  const data = useMemo(
    () =>
      balances
        .filter(
          (b) =>
            b.typeName &&
            (allowedNames.size === 0 || allowedNames.has(b.typeName)) &&
            (b.daysPerYear ?? 0) > 0,
        )
        .map((b) => ({
          name: b.typeName!,
          remaining: Math.max(0, parseFloat(b.balance || "0")),
          used: Math.max(
            0,
            (b.daysPerYear ?? 0) - parseFloat(b.balance || "0"),
          ),
          total: b.daysPerYear ?? 0,
        })),
    [balances, allowedNames],
  );

  if (data.length === 0) return null;

  const chartData = data.flatMap((d, i) => [
    {
      name: `${d.name} (used)`,
      value: d.used,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      opacity: 0.3,
    },
    {
      name: `${d.name} (remaining)`,
      value: d.remaining,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      opacity: 1,
    },
  ]);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp
              className="h-3.5 w-3.5 text-primary"
              aria-hidden="true"
            />
          </div>
          Balance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={52}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      fillOpacity={entry.opacity}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value, name) => [`${value} days`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 flex-1 min-w-0">
            {data.map((item, i) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                      }}
                    />
                    <TruncatedText text={item.name} className="text-dense font-medium text-muted-foreground" />
                  </div>
                  <span className="text-dense font-semibold text-foreground shrink-0 tabular-nums">
                    {item.remaining}/{item.total}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden ml-3.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.total > 0 ? (item.remaining / item.total) * 100 : 0}%`,
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
