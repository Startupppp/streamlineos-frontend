"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  Trophy,
  TrendingUp,
  Target,
  ArrowUpRight,
  Medal,
  Phone,
  Users,
  UserX,
  CalendarClock,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { useSalesDashboard, useCrmPeopleSlugs } from "@/lib/hooks/trpc-hooks";
import { useSession } from "next-auth/react";
import { staggerContainer, fadeUp, slideInLeft, scaleIn } from "@/lib/motion-variants";
import { safeMax, calcPercent } from "@/lib/format-utils";
import { getColorSafe, stageColors, rankStyles, sparkColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_BAR_COLOR = "bg-muted-foreground/40";
const formatRevenueValue = (v: number) => `$${(v / 1000).toFixed(0)}K`;

export default function SalesDashboardPage() {
  const { data: session } = useSession();
  const isSalesRep = session?.user?.role === "SALES";
  const { data, isLoading } = useSalesDashboard();
  const { data: slugMap } = useCrmPeopleSlugs();

  const salesStats = data?.salesStats;
  const revenueTimeline = data?.revenueTimeline ?? [];
  const salesFunnel = data?.salesFunnel ?? [];
  const topDeals = data?.topDeals ?? [];
  const salesLeaderboard = data?.salesLeaderboard ?? [];
  const salesActivity = data?.salesActivity ?? [];
  const dealsByStage = data?.dealsByStage ?? [];
  const enhanced = data?.enhancedMetrics;

  const maxLeaderboardRevenue = useMemo(
    () => safeMax(salesLeaderboard.map((r) => r.revenue)),
    [salesLeaderboard],
  );
  const maxDealsByStageCount = useMemo(
    () => safeMax(dealsByStage.map((d) => d.count)),
    [dealsByStage],
  );
  const revenueSparkData = useMemo(
    () => revenueTimeline.map((d) => d.value),
    [revenueTimeline],
  );

  const getPersonSlug = (name: string) => slugMap?.[name] ?? null;

  if (isLoading || !salesStats) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
          </Card>
          <Card className="lg:col-span-5">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title={isSalesRep ? "My Sales Hub" : "Sales Dashboard"}
      subtitle={isSalesRep ? "Your pipeline, deals, and performance at a glance" : "Pipeline overview and sales performance metrics"}
    >
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(salesStats.pipeline.value)}
          icon={DollarSign}
          trend={salesStats.pipeline.trend}
          sparkData={revenueSparkData}
          sparkColor={sparkColors.blue}
        />
        <MetricCard
          label="Deals Won"
          value={salesStats.dealsWon.value}
          icon={Trophy}
          trend={salesStats.dealsWon.trend}
          sparkColor={sparkColors.green}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${salesStats.conversionRate.value}%`}
          icon={TrendingUp}
          trend={salesStats.conversionRate.trend}
          sparkColor={sparkColors.purple}
        />
        <MetricCard
          label="Avg Deal Size"
          value={formatCurrency(salesStats.avgDealSize.value)}
          icon={Target}
          trend={salesStats.avgDealSize.trend}
          sparkColor={sparkColors.amber}
        />
      </motion.div>

      {enhanced && (
        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                Live CRM Metrics (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
                {[
                  { label: "Active Clients", value: enhanced.activeClients, icon: Users, color: "text-emerald-500" },
                  { label: "Inactive Clients", value: enhanced.inactiveClients, icon: UserX, color: "text-red-400" },
                  { label: "Total Calls", value: enhanced.totalCalls, icon: Phone, color: "text-blue-500" },
                  { label: "Meetings", value: enhanced.totalMeetings, icon: CalendarClock, color: "text-purple-500" },
                  { label: "Emails Sent", value: enhanced.totalEmails, icon: Mail, color: "text-amber-500" },
                  { label: "Site Visits", value: enhanced.totalSiteVisits, icon: MapPin, color: "text-cyan-500" },
                  { label: "Need Follow-up", value: enhanced.followUpNeeded, icon: AlertCircle, color: enhanced.followUpNeeded > 0 ? "text-red-500" : "text-muted-foreground" },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-muted/30">
                    <m.icon className={cn("h-5 w-5", m.color)} />
                    <span className="text-2xl font-bold text-foreground">{m.value}</span>
                    <span className="text-[11px] text-muted-foreground text-center leading-tight">{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                {topDeals.map((deal) => (
                  <div
                    key={`${deal.company}-${deal.stage}`}
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
                            getColorSafe(stageColors, deal.stage)
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
                  const style = isTop3 && i < rankStyles.length ? rankStyles[i] : null;
                  const revenuePercent = Number(calcPercent(rep.revenue, maxLeaderboardRevenue, 0));

                  return (
                    <motion.div
                      key={`rep-${i}`}
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
                      variants={slideInLeft}
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
                                  style?.badgeColor
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
                          <div
                            className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={revenuePercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${rep.name} revenue progress`}
                          >
                            <motion.div
                              className={cn(
                                "h-full rounded-full",
                                style?.barColor ?? DEFAULT_BAR_COLOR
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
              <div className="overflow-y-auto pr-1 max-h-[380px]">
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
                        transition={{
                          duration: 0.6,
                          delay: 0.5,
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
    </PageWrapper>
  );
}
