"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/export-csv";
import type { HrAnalyticsData } from "@/hooks/api/hr/analytics";

type AnalyticsCsvRow = { section: string; metric: string; value: string | number };

export function toAnalyticsCsvRows(data: HrAnalyticsData): AnalyticsCsvRow[] {
  return [
    { section: "Headcount", metric: "Total", value: data.headcount.total },
    { section: "Headcount", metric: "Active", value: data.headcount.active },
    { section: "Headcount", metric: "New this month", value: data.headcount.newThisMonth },
    ...data.departments.map((d) => ({ section: "Department", metric: d.name, value: d.count })),
    ...data.gender.map((g) => ({ section: "Gender", metric: g.gender, value: g.count })),
    ...data.roles.map((r) => ({ section: "Role", metric: r.role, value: r.count })),
    { section: "Attendance", metric: "Logs this month", value: data.attendance.totalLogsThisMonth },
    ...Object.entries(data.leaves.byStatus).map(([status, count]) => ({ section: "Leave by status", metric: status, value: count })),
    ...data.leaves.byMonth.map((m) => ({ section: "Leave by month", metric: m.month, value: m.count })),
    { section: "Payroll", metric: "Total cost YTD", value: data.payroll.totalCostYTD },
    { section: "Expenses", metric: "Approved YTD", value: data.expenses.approvedYTD },
    ...data.joiningExitsTrend.flatMap((t) => [
      { section: "Joins", metric: t.month, value: t.joins },
      { section: "Exits", metric: t.month, value: t.exits },
    ]),
  ];
}

export function AnalyticsExportButton({ data }: { data: HrAnalyticsData | undefined }) {
  function handleExport() {
    if (data) exportToCsv(`people-analytics-${new Date().toISOString().slice(0, 10)}.csv`, toAnalyticsCsvRows(data));
  }
  return (
    <Button type="button" variant="outline" size="sm" disabled={!data} onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      Export CSV
    </Button>
  );
}
