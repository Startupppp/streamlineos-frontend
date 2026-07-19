"use client";

import { useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadSourceReport } from "@/hooks/api/crm/leads";

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  campaign: "Campaign",
  cold_call: "Cold Call",
  website: "Website",
  social_media: "Social Media",
  walk_in: "Walk-in",
  other: "Other",
};

const SOURCE_COLORS = [
  { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  { bar: "bg-blue-400", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  { bar: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30" },
  { bar: "bg-cyan-500", badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30" },
  { bar: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
];

const FALLBACK_COLOR = { bar: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" };

function getSourceColor(index: number) {
  return SOURCE_COLORS[index % SOURCE_COLORS.length] ?? FALLBACK_COLOR;
}

function formatCurrency(val: number) {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function LeadSourceReportPage() {
  const shouldReduceMotion = useReducedMotion();
  const { data, isLoading, isError, refetch } = useLeadSourceReport();

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.sources.map((s) => s.count) ?? [])),
    [data],
  );

  const topSource = useMemo(() => data?.sources[0], [data]);

  const bestConversionSource = useMemo(() => {
    if (!data?.sources.length) return null;
    return [...data.sources].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [data]);

  const totalConverted = useMemo(
    () => data?.sources.reduce((sum, s) => sum + s.converted, 0) ?? 0,
    [data],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const containerVariants: Variants = shouldReduceMotion ? {} : staggerContainer;
  const childVariants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : fadeUp;

  return (
    <PageWrapper
      title="Lead Source Report"
      subtitle="Attribution analysis across all lead sources"
    >
      {isError ? (
        <ErrorState
          title="Report unavailable"
          description="Failed to load lead source report. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={childVariants}>
            <StatCardGrid cols={4}>
              <StatCard
                label="Total Leads"
                value={data?.total ?? 0}
                tone="blue"
                icon={Users}
                isLoading={isLoading}
              />
              <StatCard
                label="Sources Tracked"
                value={data?.sources.length ?? 0}
                tone="amber"
                icon={BarChart3}
                isLoading={isLoading}
              />
              <StatCard
                label="Total Converted"
                value={totalConverted}
                tone="emerald"
                icon={TrendingUp}
                isLoading={isLoading}
              />
              <StatCard
                label="Best Conversion"
                value={
                  bestConversionSource
                    ? `${bestConversionSource.conversionRate}% — ${SOURCE_LABELS[bestConversionSource.source] ?? bestConversionSource.source}`
                    : "—"
                }
                tone="blue"
                icon={Target}
                isLoading={isLoading}
              />
            </StatCardGrid>
          </motion.div>

          <motion.div variants={childVariants}>
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Source Attribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.sources || data.sources.length === 0 ? (
                  <EmptyState
                    illustration={<EmptyLeadsIllustration />}
                    title="No source data"
                    description="No lead source data is available yet."
                    className="min-h-[300px] border-0 bg-transparent"
                  />
                ) : (
                  <div className="space-y-5">
                    {data.sources.map((s, i) => {
                      const color = getSourceColor(i);
                      const label = SOURCE_LABELS[s.source] ?? s.source;
                      const barPct = (s.count / maxCount) * 100;

                      return (
                        <motion.div
                          key={s.source}
                          variants={childVariants}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] px-1.5 py-0 h-4", color.badge)}
                              >
                                {label}
                              </Badge>
                              {topSource?.source === s.source && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                  Top
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[11px]">
                              <div className="text-center">
                                <div className="font-semibold tabular-nums">{s.count}</div>
                                <div className="text-[10px] text-muted-foreground">leads</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {s.converted}
                                </div>
                                <div className="text-[10px] text-muted-foreground">converted</div>
                              </div>
                              <div className="text-center">
                                <div
                                  className={cn(
                                    "font-semibold tabular-nums",
                                    s.conversionRate >= 30
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : s.conversionRate >= 15
                                        ? "text-amber-700 dark:text-amber-400"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  {s.conversionRate}%
                                </div>
                                <div className="text-[10px] text-muted-foreground">rate</div>
                              </div>
                              <div className="text-center hidden sm:block">
                                <div className="font-semibold tabular-nums text-[11px]">
                                  <IndianRupee className="h-3 w-3 inline mr-0.5 text-primary" />
                                  {formatCurrency(s.totalValue)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">value</div>
                              </div>
                            </div>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={cn("h-full rounded-full origin-left", color.bar)}
                              initial={{ scaleX: shouldReduceMotion ? barPct / 100 : 0 }}
                              animate={{ scaleX: barPct / 100 }}
                              transition={{ duration: 0.7, delay: i * 0.05 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {data && data.sources.length > 0 && (
            <motion.div variants={childVariants}>
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Conversion Rate by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="min-w-[400px]">
                      <div className="flex items-end gap-3 h-36">
                        {[...data.sources]
                          .sort((a, b) => b.conversionRate - a.conversionRate)
                          .map((s, i) => {
                            const srcIdx = data.sources.findIndex(
                              (x) => x.source === s.source,
                            );
                            const color = getSourceColor(srcIdx);
                            const barH = Math.max(8, (s.conversionRate / 100) * 128);
                            const label = SOURCE_LABELS[s.source] ?? s.source;
                            return (
                              <div
                                key={s.source}
                                className="flex flex-col items-center gap-1 flex-1"
                              >
                                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                                  {s.conversionRate}%
                                </span>
                                <div
                                  className="flex-1 flex items-end w-full"
                                  style={{ height: "128px" }}
                                >
                                  <motion.div
                                    className={cn(
                                      "w-full rounded-t-md origin-bottom",
                                      color.bar,
                                    )}
                                    style={{ height: `${barH}px` }}
                                    initial={{ scaleY: shouldReduceMotion ? 1 : 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ duration: 0.6, delay: i * 0.08 }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
