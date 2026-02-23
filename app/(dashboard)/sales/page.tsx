"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  Trophy,
  TrendingUp,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const stageColors: Record<string, string> = {
  Negotiation: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Proposal: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Qualified: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Discovery: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export default function SalesDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline overview and sales performance metrics
        </p>
      </div>

      {/* Row 2: Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Row 3: Revenue Trend + Pipeline Funnel */}
      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
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

        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart data={salesFunnel} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 4: Top Deals + Leaderboard + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Deals */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Top Deals</CardTitle>
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
                            stageColors[deal.stage] || "bg-slate-500/10 text-slate-600"
                          )}
                        >
                          {deal.stage}
                        </span>
                        {getPersonSlug(deal.rep) ? (
                          <Link
                            href={`/sales/person/${getPersonSlug(deal.rep)}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {deal.rep}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">{deal.rep}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(deal.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{deal.probability}% prob</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sales Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Sales Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesLeaderboard.map((rep, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        i === 0
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : i === 1
                          ? "bg-slate-300/20 text-slate-600 dark:text-slate-300"
                          : i === 2
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {getPersonSlug(rep.name) ? (
                        <Link
                          href={`/sales/person/${getPersonSlug(rep.name)}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {rep.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{rep.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{rep.deals} deals</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(rep.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="h-full">
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

      {/* Row 5: Deals by Stage */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card>
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
                      <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{stage.count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(stage.value)} value
                    </p>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: stage.color }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(stage.count / Math.max(...dealsByStage.map((d) => d.count))) * 100}%`,
                        }}
                        transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
