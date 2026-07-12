"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  TrendingDown,
  IndianRupee,
  ExternalLink,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { useDealAging } from "@/hooks/api/crm";
import { formatINR } from "@/lib/format-utils";
import { EmptyDealsIllustration } from "@/components/illustrations";

type AgingDealRow = NonNullable<ReturnType<typeof useDealAging>["data"]>["deals"][number];

function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border">
      {stage}
    </Badge>
  );
}

function SeverityBadge({ days }: { days: number }) {
  if (days > 30) {
    return (
      <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
        Critical
      </Badge>
    );
  }
  if (days >= 15) {
    return (
      <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
      Healthy
    </Badge>
  );
}

function getDayClassName(days: number) {
  if (days > 30) return "text-destructive font-semibold";
  if (days >= 15) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

const COLUMNS: DataTableColumn<AgingDealRow>[] = [
  {
    key: "name",
    header: "Deal Name",
    sortable: true,
    sortValue: (r) => r.name,
    cell: (r) => (
      <Link
        href={`/crm/deals/${r.id}`}
        className="text-blue-600 hover:underline transition-colors truncate block max-w-[200px]"
      >
        {r.name}
      </Link>
    ),
  },
  {
    key: "stage",
    header: "Stage",
    cell: (r) => <StageBadge stage={r.stage} />,
  },
  {
    key: "assigneeName",
    header: "Assignee",
    cell: (r) =>
      r.assigneeName ?? (
        <span className="italic text-muted-foreground/60">Unassigned</span>
      ),
  },
  {
    key: "daysInStage",
    header: "Days in Stage",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    sortable: true,
    sortValue: (r) => r.daysInStage,
    cell: (r) => (
      <span className={getDayClassName(r.daysInStage)}>{r.daysInStage}d</span>
    ),
  },
  {
    key: "severity",
    header: "Severity",
    cell: (r) => <SeverityBadge days={r.daysInStage} />,
  },
  {
    key: "value",
    header: "Deal Value",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    sortable: true,
    sortValue: (r) => Number(r.value ?? 0),
    cell: (r) =>
      r.value ? (
        formatINR(r.value)
      ) : (
        <span className="text-muted-foreground/60">—</span>
      ),
  },
  {
    key: "createdAt",
    header: "Created",
    className: "font-mono tabular-nums",
    cell: (r) =>
      r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—",
  },
  {
    key: "actions",
    header: "",
    headerClassName: "w-24",
    cell: (r) => (
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link href={`/crm/deals/${r.id}`}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          View
        </Link>
      </Button>
    ),
  },
];

export default function DealAgingPage() {
  const { data, isLoading, isError, refetch } = useDealAging();

  const sortedDeals = useMemo(() => {
    if (!data?.deals) return [];
    return [...data.deals].sort((a, b) => b.daysInStage - a.daysInStage);
  }, [data?.deals]);

  const stats = useMemo(() => {
    if (!data) return { totalStale: 0, avgDays: 0, oldestDays: 0, totalValue: 0 };
    const deals = data.deals;
    const stale = deals.filter((d) => d.daysInStage > 14);
    const totalValue = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const avgDays =
      deals.length > 0
        ? Math.round(deals.reduce((sum, d) => sum + d.daysInStage, 0) / deals.length)
        : 0;
    const oldestDays = deals.length > 0 ? Math.max(...deals.map((d) => d.daysInStage)) : 0;
    return { totalStale: stale.length, avgDays, oldestDays, totalValue };
  }, [data]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Deal Aging"
      subtitle="Deals stuck in pipeline stages"
      backHref="/crm/deals"
      eyebrow="CRM / Deals"
    >
      {isError ? (
        <ErrorState
          title="Failed to load aging data"
          description="An error occurred while loading the deal aging report."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : (
        <div className="space-y-4">
          <StatCardGrid cols={4}>
            <StatCard
              label="Total Stale Deals"
              value={stats.totalStale}
              icon={AlertTriangle}
              tone="red"
              isLoading={isLoading}
            />
            <StatCard
              label="Avg Days Stuck"
              value={`${stats.avgDays}d`}
              icon={Clock}
              tone="amber"
              isLoading={isLoading}
            />
            <StatCard
              label="Oldest Deal"
              value={`${stats.oldestDays}d`}
              icon={TrendingDown}
              tone="blue"
              isLoading={isLoading}
            />
            <StatCard
              label="Total Value at Risk"
              value={formatINR(stats.totalValue)}
              icon={IndianRupee}
              tone="blue"
              isLoading={isLoading}
            />
          </StatCardGrid>

          <DataTable
            data={sortedDeals}
            columns={COLUMNS}
            getRowKey={(r) => r.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustration={<EmptyDealsIllustration />}
                title="All deals are moving smoothly"
                description="No deals are currently stuck in any pipeline stage."
                className="border-0 bg-transparent min-h-[40vh]"
              />
            }
            minWidth="780px"
          />
        </div>
      )}
    </PageWrapper>
  );
}
