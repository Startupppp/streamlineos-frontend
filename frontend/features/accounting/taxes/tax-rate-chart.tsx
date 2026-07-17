"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};
const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

export interface ChartDatum {
  rate: string;
  cgst: number;
  sgst: number;
  igst: number;
}

interface TaxRateChartProps {
  title: string;
  data: ChartDatum[];
}

export function TaxRateChart({ title, data }: TaxRateChartProps) {
  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="rate" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} width={48} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="cgst" name="CGST" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="sgst" name="SGST" fill="#06b6d4" radius={[2, 2, 0, 0]} />
              <Bar dataKey="igst" name="IGST" fill="#2563eb" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
