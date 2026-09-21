"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import { CHART_TOOLTIP_STYLE, AXIS_TICK } from "@/features/crm/shared/constants";
import type { CampaignAttribution } from "@/types/crm/campaigns";

export function AttributionChart({ data }: { data: CampaignAttribution[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No attribution data available
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d, i) => ({
    name: d.campaignName.length > 18 ? d.campaignName.slice(0, 18) + "…" : d.campaignName,
    revenue: Math.round(d.dealRevenueCents / 100),
    fill: getCrmTokenClasses(
      ["blue", "emerald", "amber", "sky", "blue", "cyan", "orange", "pink"][i % 8] ?? "blue"
    ).chartHex,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
