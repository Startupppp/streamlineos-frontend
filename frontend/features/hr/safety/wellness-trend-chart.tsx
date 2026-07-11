"use client";

import { useWellnessTrend } from "@/hooks/api/hr/safety";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  fromDate?: string;
  toDate?: string;
}

export function WellnessTrendChart({ fromDate, toDate }: Props) {
  const { data, isLoading } = useWellnessTrend(fromDate, toDate);

  return (
    <Card className="p-4 bg-card border border-border rounded-xl">
      <p className="text-sm font-semibold mb-3 text-foreground">Organisation Wellness Trend</p>
      <p className="text-xs text-muted-foreground mb-4">
        Rolling average (min. 5 respondents per day shown)
      </p>
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground text-center py-10">
          Not enough data yet (need 5+ respondents per day)
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => format(new Date(v), "MMM d")}
            />
            <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} tickCount={5} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)} / 10`, "Avg Score"]}
              labelFormatter={(label) => format(new Date(String(label)), "MMM d, yyyy")}
            />
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#1d4ed8" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
