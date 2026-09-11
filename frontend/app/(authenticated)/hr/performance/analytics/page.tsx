"use client";

import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { useMemo, memo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { ExternalLink, BarChart2, CheckCircle, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useReviewCycles, useHrPerformanceReviews } from "@/hooks/api/hr";

import type { ReviewCycle } from "@/types/hr";

const PerformanceAnalyticsCharts = dynamic(
  () => import("@/features/hr/analytics/performance-analytics-charts").then((m) => ({ default: m.PerformanceAnalyticsCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6 h-72 animate-pulse" />
          <div className="bg-card border border-border rounded-lg p-6 h-72 animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-lg p-6 h-52 animate-pulse" />
      </div>
    ),
  },
);

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  ACTIVE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  COMPLETED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  CANCELLED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const REVIEW_CYCLE_COLUMNS: DataTableColumn<ReviewCycle>[] = [
  {
    key: "name",
    header: "Name",
    cell: (c) => <span className="text-sm font-medium text-foreground">{c.name}</span>,
  },
  {
    key: "type",
    header: "Type",
    cell: (c) => <Badge variant="outline" className="text-xs">{c.type}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (c) => (
      <Badge
        variant="outline"
        className={`text-xs ${CYCLE_STATUS_STYLES[c.status ?? ""] ?? "bg-muted text-muted-foreground border-border"}`}
      >
        {c.status}
      </Badge>
    ),
  },
  {
    key: "period",
    header: "Period",
    className: "text-sm text-muted-foreground",
    cell: (c) =>
      `${new Date(c.periodStart).toLocaleDateString()} — ${new Date(c.periodEnd).toLocaleDateString()}`,
  },
];

const PerformanceAnalyticsStats = memo(function PerformanceAnalyticsStats({
  totalCycles,
  activeCycles,
}: {
  totalCycles: number;
  activeCycles: number;
}) {
  return (
    <StatCardGrid cols={4}>
      <StatCard label="Review Cycles" value={totalCycles} icon={BarChart2} tone="blue" />
      <StatCard label="Active Cycles" value={activeCycles} icon={CheckCircle} tone="emerald" />
      <StatCard label="Avg Rating" value="—" icon={Star} tone="amber" />
      <StatCard label="OKR Progress" value="—" icon={Target} tone="default" />
    </StatCardGrid>
  );
});

export default function PerformanceAnalyticsPage() {
  const { data: cycles = [], isLoading } = useReviewCycles();
  const { data: reviews } = useHrPerformanceReviews();

  const activeCycles = cycles.filter((c: ReviewCycle) => c.status === "ACTIVE").length;

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    cycles.forEach((c: ReviewCycle) => {
      const key = c.type ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [cycles]);

  const ratingDist = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of (reviews?.data ?? [])) {
      if (r.overallRating) {
        const bucket = Math.round(Number(r.overallRating));
        if (bucket >= 1 && bucket <= 5) counts[bucket] = (counts[bucket] ?? 0) + 1;
      }
    }
    return Object.entries(counts).map(([rating, count]) => ({ rating: `★${rating}`, count }));
  }, [reviews]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    cycles.forEach((c: ReviewCycle) => {
      const key = c.status ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cycles]);

  return (
    <PageWrapper
      title="Performance Analytics"
      subtitle="Review cycle insights and metrics"
      backHref="/hr/performance"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/hr/analytics">
            Full Analytics
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
            <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <PerformanceAnalyticsStats totalCycles={cycles.length} activeCycles={activeCycles} />

          <PerformanceAnalyticsCharts
            typeData={typeData}
            statusData={statusData}
            ratingDist={ratingDist}
          hasReviews={Boolean(reviews?.data.length)}
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.35 }}
            className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Review Cycles</h2>
            </div>
            <DataTable<ReviewCycle>
              data={cycles}
              columns={REVIEW_CYCLE_COLUMNS}
              getRowKey={(c) => c.id}
              emptyState={<ChartEmptyState message="No review cycles found" height={220} compact />}
            />
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
}
