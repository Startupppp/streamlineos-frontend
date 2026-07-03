"use client";

import { AnalyticsChartCard } from "./analytics-chart-card";
import { EmptyChart } from "./empty-chart";

interface SlaReportData {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
}

interface SlaComplianceChartProps {
  slaReport: SlaReportData | undefined;
}

export function SlaComplianceChart({ slaReport }: SlaComplianceChartProps) {
  return (
    <AnalyticsChartCard
      title="SLA Compliance Rate"
      data={[]}
      filename="sla-compliance"
    >
      {!slaReport ? (
        <EmptyChart message="No SLA data available" />
      ) : (
        <div className="flex flex-col items-center justify-center h-[280px]">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                className={
                  slaReport.complianceRate >= 80
                    ? "stroke-emerald-500"
                    : slaReport.complianceRate >= 50
                      ? "stroke-amber-500"
                      : "stroke-red-500"
                }
                strokeWidth="8"
                strokeDasharray={`${slaReport.complianceRate * 2.64} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{slaReport.complianceRate}%</span>
              <span className="text-xs text-muted-foreground">Compliant</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs justify-center">
            <span className="text-muted-foreground">Total: {slaReport.total}</span>
            <span className="text-emerald-500">Met: {slaReport.compliant}</span>
            <span className="text-red-500">Breached: {slaReport.breached}</span>
          </div>
        </div>
      )}
    </AnalyticsChartCard>
  );
}
