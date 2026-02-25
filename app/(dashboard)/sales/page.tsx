"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  Trophy,
  TrendingUp,
  Target,
  ArrowUpRight,
  Medal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/crm/metric-card";
import { MiniAreaChart } from "@/components/crm/mini-area-chart";
import { FunnelChart } from "@/components/crm/funnel-chart";
import { ActivityFeed } from "@/components/crm/activity-feed";
import {
  salesStats,
  revenueTimeline,
  salesFunnel,
  topDeals,
  salesLeaderboard,
  salesActivity,
  dealsByStage,
  formatCurrency,
} from "@/lib/data/crm-mock-data";
import { cn } from "@/lib/utils";
import { getPersonSlug } from "@/lib/data/crm-people-data";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { safeMax } from "@/lib/format-utils";

const stageColors: Record<string, string> = {
  Negotiation: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Proposal: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Qualified: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Discovery: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

const rankStyles = [
  {
    bg: "bg-gold/15 dark:bg-gold/20",
    text: "text-gold",
    border: "border-gold/30",
    ring: "ring-gold/20",
    label: "1st",
  },
  {
    bg: "bg-slate-400/15 dark:bg-slate-400/20",
    text: "text-slate-500 dark:text-slate-300",
    border: "border-slate-400/30",
    ring: "ring-slate-400/20",
    label: "2nd",
  },
  {
    bg: "bg-amber-700/15 dark:bg-amber-700/20",
    text: "text-amber-700 dark:text-amber-600",
    border: "border-amber-700/30",
    ring: "ring-amber-700/20",
    label: "3rd",
  },
];

export default function SalesDashboardPage() {
  const maxLeaderboardRevenue = safeMax(salesLeaderboard.map((r) => r.revenue));
  const maxDealsByStageCount = safeMax(dealsByStage.map((d) => d.count));

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Sales Dashboard"
          description="Pipeline overview and sales performance metrics"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(salesStats.pipeline.value)}
          icon={DollarSign}
          trend={salesStats.pipeline.trend}
          sparkData={revenueTimeline.map((d) => d.value)}
          sparkColor="#3B82F6"
        />
        <MetricCard
          label="Deals Won"
          value={salesStats.dealsWon.value}
          icon={Trophy}
          trend={salesStats.dealsWon.trend}
          sparkColor="#10B981"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${salesStats.conversionRate.value}%`}
          icon={TrendingUp}
          trend={salesStats.conversionRate.trend}
          sparkColor="#8B5CF6"
        />
        <MetricCard
          label="Avg Deal Size"
          value={formatCurrency(salesStats.avgDealSize.value)}
          icon={Target}
          trend={salesStats.avgDealSize.trend}
          sparkColor="#F59E0B"
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div className="lg:col-span-7" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={revenueTimeline}
                color="#3B82F6"
                height={240}
                formatValue={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-gold" />
                Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart data={salesFunnel} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-gold" />
                Top Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDeals.map((deal, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {deal.company}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            stageColors[deal.stage] ||
                              "bg-slate-500/10 text-slate-600"
                          )}
                        >
                          {deal.stage}
                        </span>
                        {getPersonSlug(deal.rep) ? (
                          <Link
                            href={`/sales/person/${getPersonSlug(deal.rep)}`}
                            className="text-xs text-gold hover:underline"
                          >
                            {deal.rep}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {deal.rep}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(deal.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {deal.probability}% prob
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" />
                Sales Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesLeaderboard.map((rep, i) => {
                  const isTop3 = i < 3;
                  const style = isTop3 ? rankStyles[i] : null;
                  const revenuePercent =
                    (rep.revenue / maxLeaderboardRevenue) * 100;

                  return (
                    <motion.div
                      key={i}
                      className={cn(
                        "relative rounded-xl p-3 transition-colors",
                        isTop3
                          ? cn(
                              "border",
                              style?.bg,
                              style?.border,
                              "ring-1",
                              style?.ring
                            )
                          : "border border-border/50 bg-muted/30"
                      )}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shrink-0",
                            isTop3
                              ? cn(style?.bg, style?.text)
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isTop3 ? (
                            <>
                              <Medal className={cn("h-4 w-4", style?.text)} />
                              <span
                                className={cn(
                                  "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                                  i === 0
                                    ? "bg-gold text-white"
                                    : i === 1
                                    ? "bg-slate-400 text-white"
                                    : "bg-amber-700 text-white"
                                )}
                              >
                                {i + 1}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs">{i + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              {getPersonSlug(rep.name) ? (
                                <Link
                                  href={`/sales/person/${getPersonSlug(rep.name)}`}
                                  className={cn(
                                    "text-sm font-semibold truncate block transition-colors",
                                    isTop3
                                      ? cn(
                                          style?.text,
                                          "hover:opacity-80"
                                        )
                                      : "text-foreground hover:text-gold"
                                  )}
                                >
                                  {rep.name}
                                </Link>
                              ) : (
                                <p
                                  className={cn(
                                    "text-sm font-semibold truncate",
                                    isTop3 ? style?.text : "text-foreground"
                                  )}
                                >
                                  {rep.name}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {rep.deals} deals closed
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={cn(
                                  "text-sm font-bold tabular-nums",
                                  isTop3 ? style?.text : "text-foreground"
                                )}
                              >
                                {formatCurrency(rep.revenue)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                            <motion.div
                              className={cn(
                                "h-full rounded-full",
                                i === 0
                                  ? "bg-gold"
                                  : i === 1
                                  ? "bg-slate-400"
                                  : i === 2
                                  ? "bg-amber-700"
                                  : "bg-muted-foreground/40"
                              )}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${revenuePercent}%`,
                              }}
                              transition={{
                                duration: 0.6,
                                delay: 0.4 + i * 0.08,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: "380px" }}>
                <ActivityFeed items={salesActivity} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {dealsByStage.map((stage, i) => (
                <motion.div
                  key={stage.stage}
                  className="relative overflow-hidden rounded-xl border border-border p-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
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
                      <span className="text-sm font-medium text-foreground">
                        {stage.stage}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {stage.count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(stage.value)} value
                    </p>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: stage.color }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(stage.count / maxDealsByStageCount) * 100}%`,
                        }}
                        transition={{
                          duration: 0.6,
                          delay: 0.5 + i * 0.08,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
