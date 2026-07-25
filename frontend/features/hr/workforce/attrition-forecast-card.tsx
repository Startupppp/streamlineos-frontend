"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useHrAttritionForecast } from "@/hooks/api/hr/workforce";
import {
  AnalyticsChartCard,
  SectionSkeleton,
  EmptyChart,
  chartTooltipStyle,
  chartGridProps,
  chartAxisTick,
  CHART_SEMANTIC,
} from "@/features/hr/analytics/shared";

export function AttritionForecastCard() {
  const { data, isLoading } = useHrAttritionForecast();

  const hasHistory = (data?.historical.length ?? 0) > 0;
  const combined = hasHistory
    ? [
        ...(data?.historical.map((h) => ({ month: h.month, historical: h.rate, projected: null })) ?? []),
        ...(data?.forecast.map((f) => ({ month: f.month, historical: null, projected: f.projectedRate })) ?? []),
      ]
    : [];

  return (
    <AnalyticsChartCard title="Attrition Forecast (Trend-Based Estimate — Not a Prediction)">
      {isLoading ? (
        <SectionSkeleton rows={8} />
      ) : !combined.length ? (
        <EmptyChart label="No exits recorded in the last 12 months — a trend appears once attrition history exists" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={combined}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} width={32} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${Number(value)}%`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="historical"
                stroke={CHART_SEMANTIC.primary}
                strokeWidth={2}
                dot={false}
                name="Historical"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke={CHART_SEMANTIC.warning}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="Projected"
              />
            </LineChart>
          </ResponsiveContainer>
          {data?.disclaimer ? (
            <p className="mt-2 text-xs text-muted-foreground">{data.disclaimer}</p>
          ) : null}
        </>
      )}
    </AnalyticsChartCard>
  );
}
