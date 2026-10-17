"use client";

import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useOrgDisplay } from "@/hooks/api/org-display";
import {
  useSalesAging,
  useSalesCohort,
  useSalesFunnel,
  useSalesVelocity,
  type SalesRange,
} from "@/hooks/api/crm/sales";
import { formatMoneyCompact } from "@/lib/format-utils";
import { LABEL_CELL, NUM_CELL, ReportTable, SalesReportCard } from "./sales-report-card";

const AGING_THRESHOLD_DAYS = 14;
const COHORT_MONTHS = 6;

export function SalesFunnelReport({ range }: { range: SalesRange }) {
  const query = useSalesFunnel(range);
  const money = useOrgDisplay();
  const rows = query.data ?? [];
  return (
    <SalesReportCard
      title="Funnel"
      description="Deals per stage, and how many fall away before the next."
      permission="sales:view"
      query={query}
      isEmpty={rows.length === 0}
      emptyText="No deals in this period."
    >
      <ReportTable headers={["Stage", "Deals", "Value", "Drop-off"]}>
        {rows.map((row) => (
          <tr key={row.stage} className="border-b border-border/60 last:border-0">
            <td className={LABEL_CELL}>{row.stage}</td>
            <td className={NUM_CELL}>{row.count}</td>
            <td className={NUM_CELL}>{formatMoneyCompact(row.value, money)}</td>
            <td className={NUM_CELL}>{row.dropOffPct === null ? "—" : `${row.dropOffPct}%`}</td>
          </tr>
        ))}
      </ReportTable>
    </SalesReportCard>
  );
}

export function SalesVelocityReport({ range }: { range: SalesRange }) {
  const query = useSalesVelocity(range);
  const velocity = query.data;
  return (
    <SalesReportCard
      title="Velocity"
      description="Days from a deal opening to it being won."
      permission="sales:view"
      query={query}
      isEmpty={!velocity || velocity.dealCount === 0}
      emptyText="No deals were won in this period."
    >
      {velocity ? (
        <StatCardGrid cols={4}>
          <StatCard label="Average" value={`${velocity.avgDaysToClose} d`} hint={`${velocity.dealCount} won`} />
          <StatCard label="Median" value={`${velocity.medianDaysToClose} d`} />
          <StatCard label="Fastest" value={`${velocity.fastestCloseDays} d`} />
          <StatCard label="Slowest" value={`${velocity.slowestCloseDays} d`} />
        </StatCardGrid>
      ) : null}
    </SalesReportCard>
  );
}

export function SalesAgingReport() {
  const query = useSalesAging(AGING_THRESHOLD_DAYS);
  const money = useOrgDisplay();
  const rows = query.data ?? [];
  return (
    <SalesReportCard
      title="Aging"
      description={`Open deals untouched for more than ${AGING_THRESHOLD_DAYS} days, oldest first.`}
      permission="sales:view"
      query={query}
      isEmpty={rows.length === 0}
      emptyText="No open deal has gone that long without an update."
    >
      <ReportTable headers={["Deal", "Stage", "Value", "Idle (days)"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-border/60 last:border-0">
            <td className={LABEL_CELL}>{row.companyName}</td>
            <td className={LABEL_CELL}>{row.stage}</td>
            <td className={NUM_CELL}>{formatMoneyCompact(row.value, money)}</td>
            <td className={NUM_CELL}>{row.daysSinceUpdate}</td>
          </tr>
        ))}
      </ReportTable>
    </SalesReportCard>
  );
}

export function SalesCohortReport() {
  const query = useSalesCohort(COHORT_MONTHS);
  const rows = query.data ?? [];
  return (
    <SalesReportCard
      title="Cohorts"
      description={`Leads created each month over the last ${COHORT_MONTHS}, and how many converted.`}
      permission="sales:view"
      query={query}
      isEmpty={rows.length === 0}
      emptyText="No leads were created in these months."
    >
      <ReportTable headers={["Month", "Created", "Converted", "Rate", "Avg days"]}>
        {rows.map((row) => (
          <tr key={row.cohortMonth} className="border-b border-border/60 last:border-0">
            <td className={LABEL_CELL}>{row.cohortMonth}</td>
            <td className={NUM_CELL}>{row.created}</td>
            <td className={NUM_CELL}>{row.converted}</td>
            <td className={NUM_CELL}>{`${row.conversionRate}%`}</td>
            <td className={NUM_CELL}>{row.avgDaysToConvert ?? "—"}</td>
          </tr>
        ))}
      </ReportTable>
    </SalesReportCard>
  );
}
