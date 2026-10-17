"use client";

import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useSalesCycleLength, useSalesLostAnalysis } from "@/hooks/api/crm/sales";
import { formatMoneyCompact } from "@/lib/format-utils";
import { LABEL_CELL, NUM_CELL, ReportTable, SalesReportCard } from "./sales-report-card";

function days(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value} d`;
}

export function SalesCycleLengthReport() {
  const query = useSalesCycleLength();
  const cycle = query.data;
  return (
    <SalesReportCard
      title="Sales cycle"
      description="How long won deals took, start to close."
      permission="crm:deals:read"
      query={query}
      isEmpty={!cycle || cycle.totalDeals === 0}
      emptyText="No won deals to measure yet."
    >
      {cycle ? (
        <div className="flex flex-col gap-3">
          <StatCardGrid cols={4}>
            <StatCard label="Average" value={days(cycle.avgDays)} hint={`${cycle.totalDeals} deals`} />
            <StatCard label="Median" value={days(cycle.medianDays)} />
            <StatCard label="Shortest" value={days(cycle.minDays)} />
            <StatCard label="Longest" value={days(cycle.maxDays)} />
          </StatCardGrid>
          <ReportTable headers={["Length", "Deals"]}>
            {cycle.histogram.map((bucket) => (
              <tr key={bucket.label} className="border-b border-border/60 last:border-0">
                <td className={LABEL_CELL}>{bucket.label}</td>
                <td className={NUM_CELL}>{bucket.count}</td>
              </tr>
            ))}
          </ReportTable>
        </div>
      ) : null}
    </SalesReportCard>
  );
}

export function SalesLostAnalysisReport() {
  const query = useSalesLostAnalysis();
  const money = useOrgDisplay();
  const lost = query.data;
  return (
    <SalesReportCard
      title="Lost deals"
      description={lost ? `${lost.total} lost, worth ${formatMoneyCompact(lost.totalValue, money)}.` : undefined}
      permission="crm:deals:read"
      query={query}
      isEmpty={!lost || lost.total === 0}
      emptyText="No deals have been lost."
    >
      {lost ? (
        <ReportTable headers={["Reason", "Deals", "Value", "Share"]}>
          {lost.reasons.map((row) => (
            <tr key={row.reason} className="border-b border-border/60 last:border-0">
              <td className={LABEL_CELL}>{row.reason}</td>
              <td className={NUM_CELL}>{row.count}</td>
              <td className={NUM_CELL}>{formatMoneyCompact(row.totalValue, money)}</td>
              <td className={NUM_CELL}>{`${row.pct}%`}</td>
            </tr>
          ))}
        </ReportTable>
      ) : null}
    </SalesReportCard>
  );
}
