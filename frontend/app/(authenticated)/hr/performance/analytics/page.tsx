"use client";

import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ExternalLink, BarChart2, CheckCircle, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useReviewCycles } from "@/hooks/api/hr";
import { useHrPerformanceReviews } from "@/hooks/api/hr";
import type { ReviewCycle } from "@/types/hr";

const CHART_COLORS = ["#1d4ed8", "#06b6d4", "#60a5fa", "#8b5cf6"];

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const REVIEW_CYCLE_COLUMNS: DataTableColumn<ReviewCycle>[] = [
  {
    key: "name",
    header: "Name",
    cell: (c) => <span className="text-sm font-medium text-foreground">{c.name}</span>,
    sortable: true,
    sortValue: (c) => c.name,
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

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({ label, value, icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
      className="bg-card border border-border rounded-lg shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

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
    for (const r of (reviews ?? [])) {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-5 animate-pulse space-y-3">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
            <div className="bg-card rounded-lg border border-border p-6 h-72 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Review Cycles"
              value={cycles.length}
              icon={<BarChart2 className="w-4 h-4 text-foreground" />}
              color="bg-muted"
              delay={0.05}
            />
            <StatCard
              label="Active Cycles"
              value={activeCycles}
              icon={<CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
              color="bg-green-100 dark:bg-green-500/10"
              delay={0.1}
            />
            <StatCard
              label="Avg Rating"
              value="—"
              icon={<Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
              color="bg-amber-100 dark:bg-amber-500/10"
              delay={0.15}
            />
            <StatCard
              label="OKR Progress"
              value="—"
              icon={<Target className="w-4 h-4 text-foreground" />}
              color="bg-muted"
              delay={0.2}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: 0.25 }}
              className="bg-card border border-border rounded-lg shadow-sm p-6"
            >
              <h2 className="text-base font-semibold text-foreground mb-4">Cycles by Type</h2>
              {typeData.length === 0 ? (
                <ChartEmptyState height={220} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: 0.3 }}
              className="bg-card border border-border rounded-lg shadow-sm p-6"
            >
              <h2 className="text-base font-semibold text-foreground mb-4">Status Distribution</h2>
              {statusData.length === 0 ? (
                <ChartEmptyState height={220} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.32 }}
            className="bg-card border border-border rounded-lg shadow-sm p-6"
          >
            <h2 className="text-base font-semibold text-foreground mb-4">Rating Distribution</h2>
            {!reviews?.length ? (
              <ChartEmptyState height={180} />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ratingDist} barSize={32}>
                  <XAxis dataKey="rating" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

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
