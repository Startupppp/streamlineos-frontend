"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { SalesFunnelChart } from "@/components/charts/sales-funnel-chart";
import { RevenueVsGoalChart } from "@/components/charts/revenue-vs-goal-chart";
import { fadeUp, scaleIn } from "@/lib/motion-variants";
import { sparkColors } from "@/lib/theme-constants";
import { formatCurrency } from "@/lib/format-utils";
import type { SalesFunnelItem, DealsByStage } from "@/types/crm/deals";
import type { SalesFunnelStageResult, RevenueVsGoalEntryResult } from "@/lib/api/hooks/crm/analytics";

const formatRevenueValue = (v: number) => `$${(v / 1000).toFixed(0)}K`;

type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "ytd";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
  ytd: "Year to Date",
};

interface SalesPipelineChartsProps {
  revenueTimeline: { month: string; value: number }[];
  funnelData: SalesFunnelStageResult[] | undefined;
  salesFunnel: SalesFunnelItem[];
  revenueVsGoalData: RevenueVsGoalEntryResult[];
  dealsByStage: DealsByStage[];
  maxDealsByStageCount: number;
  datePreset: DatePreset;
}

export function SalesPipelineCharts({
  revenueTimeline,
  funnelData,
  salesFunnel,
  revenueVsGoalData,
  dealsByStage,
  maxDealsByStageCount,
  datePreset,
}: SalesPipelineChartsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <motion.div className="lg:col-span-7" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={revenueTimeline}
                color={sparkColors.blue}
                height={240}
                formatValue={formatRevenueValue}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Pipeline Funnel
                {datePreset !== "all" && (
                  <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                    {DATE_PRESET_LABELS[datePreset]}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {funnelData ? (
                <SalesFunnelChart data={funnelData} />
              ) : (
                <FunnelChart data={salesFunnel} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Revenue vs Target ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueVsGoalChart data={revenueVsGoalData} />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No deals yet. Create your first deal to see stage breakdown.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {dealsByStage.map((stage) => (
                  <motion.div
                    key={stage.stage}
                    className="relative overflow-hidden rounded-xl border border-border p-4"
                    variants={scaleIn}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{stage.count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(stage.value)} value
                      </p>
                      <div
                        className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={stage.count}
                        aria-valuemin={0}
                        aria-valuemax={maxDealsByStageCount}
                        aria-label={`${stage.stage} deal count`}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: stage.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(stage.count / maxDealsByStageCount) * 100}%`,
                          }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
