"use client";

import { useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  TrendingDown,
  TrendingUp,
  Target,
  BarChart3,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDealsIllustration } from "@/components/illustrations";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWinLossAnalysis } from "@/hooks/api/crm";
import { formatCurrency } from "@/features/crm/lib/format-currency";

const REASON_COLORS = [
  "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  "bg-muted text-muted-foreground border-border",
];

export default function WinLossAnalysisPage() {
  const shouldReduceMotion = useReducedMotion();
  const { data, isLoading, isError, refetch } = useWinLossAnalysis();

  const maxReasonCount = useMemo(
    () => Math.max(1, ...(data?.lostByReason.map((r) => r.count) ?? [])),
    [data],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  if (isLoading) {
    return (
      <PageWrapper
        title="Win/Loss Analysis"
        subtitle="Deal outcome breakdown and lost reason attribution"
      >
        <div className="space-y-4">
          <StatCardGrid cols={4}>
            <StatCard label="Won Deals" value="" isLoading icon={Trophy} tone="emerald" />
            <StatCard label="Lost Deals" value="" isLoading icon={TrendingDown} tone="red" />
            <StatCard label="Win Rate" value="" isLoading icon={Target} tone="amber" />
            <StatCard label="Won Value" value="" isLoading icon={IndianRupee} tone="blue" />
          </StatCardGrid>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Win/Loss Analysis"
        subtitle="Deal outcome breakdown and lost reason attribution"
      >
        <ErrorState
          title="Failed to load win/loss data"
          description="An error occurred while loading the analysis."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const s = data?.summary ?? {
    won: 0,
    wonValue: 0,
    lost: 0,
    lostValue: 0,
    total: 0,
    winRate: 0,
  };

  if (s.total === 0) {
    return (
      <PageWrapper
        title="Win/Loss Analysis"
        subtitle="Deal outcome breakdown and lost reason attribution"
      >
        <EmptyState
          illustration={<EmptyDealsIllustration />}
          title="No closed deals yet"
          description="Win/loss data will appear once deals are marked as won or lost."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const wonPct = s.total > 0 ? (s.won / s.total) * 100 : 0;
  const lostPct = s.total > 0 ? (s.lost / s.total) * 100 : 0;
  const totalRevenue = s.wonValue + s.lostValue;

  return (
    <PageWrapper
      title="Win/Loss Analysis"
      subtitle="Deal outcome breakdown and lost reason attribution"
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCardGrid cols={4}>
            <StatCard label="Won Deals" value={s.won} tone="emerald" icon={Trophy} />
            <StatCard label="Lost Deals" value={s.lost} tone="red" icon={TrendingDown} />
            <StatCard label="Win Rate" value={`${s.winRate}%`} tone="amber" icon={Target} />
            <StatCard label="Won Value" value={formatCurrency(s.wonValue)} tone="blue" icon={IndianRupee} />
          </StatCardGrid>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Outcome Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{s.won}</div>
                  <div className="text-sm text-muted-foreground mt-1">Won</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(s.wonValue)}</div>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400">{s.lost}</div>
                  <div className="text-sm text-muted-foreground mt-1">Lost</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(s.lostValue)}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Won {wonPct.toFixed(0)}%</span>
                  <span>Lost {lostPct.toFixed(0)}%</span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full"
                    style={{ width: `${wonPct}%` }}
                  />
                  <div
                    className="h-full bg-red-500 rounded-r-full"
                    style={{ width: `${lostPct}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total revenue at stake</span>
                  <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Revenue captured</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {totalRevenue > 0
                      ? `${Math.round((s.wonValue / totalRevenue) * 100)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-red-600 dark:text-red-400" />
                Lost Reason Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.lostByReason || data.lostByReason.length === 0 ? (
                <ChartEmptyState message="No lost deals recorded yet" height={160} compact />
              ) : (
                <ScrollArea className="max-h-[260px]">
                  <div className="space-y-3 pr-2">
                    {data.lostByReason.map((r, i) => {
                      const barPct = (r.count / maxReasonCount) * 100;
                      const colorClass = REASON_COLORS[i % REASON_COLORS.length];
                      return (
                        <div key={r.reason}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              variant="outline"
                              className={cn("text-micro h-5 px-2 py-0.5 max-w-[140px] truncate", colorClass)}
                            >
                              {r.reason}
                            </Badge>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-semibold tabular-nums">{r.count}</span>
                              <span className="text-muted-foreground w-20 text-right font-mono tabular-nums">
                                {formatCurrency(r.totalValue)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full w-full rounded-full bg-red-600 origin-left"
                              style={{
                                transform: `scaleX(${barPct / 100})`,
                                transition: shouldReduceMotion
                                  ? "none"
                                  : `transform 0.25s ease-out ${i * 0.04}s`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
