"use client";

import { useState } from "react";
import {
  Ticket,
  Inbox,
  Layers,
  Timer,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RefreshCcw,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFiltersBar } from "@/features/support/reports/report-filters";
import dynamic from "next/dynamic";

const OverviewCharts = dynamic(
  () => import("@/features/support/reports/overview-charts").then((m) => ({ default: m.OverviewCharts })),
  { ssr: false, loading: () => <Skeleton className="h-[224px]" /> }
);
import { ExportCsvButton } from "@/features/support/reports/export-csv-button";
import { useSupportOverviewReport } from "@/hooks/api/support/reports";
import type { SupportReportFilters } from "@/hooks/api/support/reports";
import { formatMinutes, formatPercent, formatRatioPercent } from "@/features/support/reports/lib/format";

export default function SupportOverviewReportPage() {
  const [filters, setFilters] = useState<SupportReportFilters>({});
  const { data, isLoading, isError, refetch } = useSupportOverviewReport(filters);

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Support Overview"
      subtitle="Ticket volume, response times, and SLA health across the helpdesk."
      filters={<ReportFiltersBar filters={filters} onChange={setFilters} />}
      actions={
        data && (
          <ExportCsvButton
            filename="support-overview.csv"
            rows={[
              {
                newTickets: data.newTickets,
                openTickets: data.openTickets,
                backlog: data.backlog,
                avgFirstResponseMinutes: data.avgFirstResponseMinutes ?? "",
                avgResolutionMinutes: data.avgResolutionMinutes ?? "",
                slaCompliancePct: data.slaCompliancePct ?? "",
                slaBreachCount: data.slaBreachCount,
                reopenRate: data.reopenRate,
              },
            ]}
          />
        )
      }
    >
      {isError ? (
        <ErrorState title="Could not load the overview report" onRetry={handleRetry} />
      ) : isLoading || !data ? (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGridSkeleton cols={4} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl border border-border bg-card" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGrid cols={4}>
            <StatCard label="New Tickets" value={data.newTickets} icon={Ticket} tone="blue" />
            <StatCard label="Open Tickets" value={data.openTickets} icon={Inbox} tone="default" />
            <StatCard label="Backlog" value={data.backlog} icon={Layers} tone="amber" />
            <StatCard
              label="Avg First Response"
              value={formatMinutes(data.avgFirstResponseMinutes)}
              icon={Timer}
              tone="blue"
            />
            <StatCard
              label="Avg Resolution"
              value={formatMinutes(data.avgResolutionMinutes)}
              icon={Clock}
              tone="blue"
            />
            <StatCard
              label="SLA Compliance"
              value={formatPercent(data.slaCompliancePct)}
              icon={ShieldCheck}
              tone="emerald"
            />
            <StatCard
              label="SLA Breaches"
              value={data.slaBreachCount}
              icon={ShieldAlert}
              tone="red"
            />
            <StatCard
              label="Reopen Rate"
              value={formatRatioPercent(data.reopenRate)}
              icon={RefreshCcw}
              tone="amber"
            />
          </StatCardGrid>

          <OverviewCharts
            ticketsByChannel={data.ticketsByChannel}
            ticketsByPriority={data.ticketsByPriority}
            ticketsByCategory={data.ticketsByCategory}
          />
        </div>
      )}
    </PageWrapper>
  );
}
