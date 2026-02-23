"use client";

import { motion } from "framer-motion";
import {
  Megaphone,
  UserPlus,
  Target,
  TrendingUp,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/crm/metric-card";
import { MiniAreaChart } from "@/components/crm/mini-area-chart";
import { FunnelChart } from "@/components/crm/funnel-chart";
import { MiniDonutChart } from "@/components/crm/mini-donut-chart";
import {
  marketingStats,
  mqlTimeline,
  leadFunnel,
  campaigns,
  channelBreakdown,
  contentPerformance,
  upcomingEvents,
  formatCurrency,
  formatNumber,
} from "@/lib/data/crm-mock-data";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  active: { icon: Play, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  paused: { icon: Pause, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10" },
  completed: { icon: CheckCircle2, color: "text-slate-700 dark:text-slate-400", bg: "bg-slate-500/10" },
};

const eventStatusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export default function MarketingDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Campaign performance, lead generation, and marketing ROI
        </p>
      </div>

      {/* Row 2: Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Campaigns"
          value={marketingStats.campaigns.value}
          icon={Megaphone}
          trend={marketingStats.campaigns.trend}
          sparkColor="#3B82F6"
        />
        <MetricCard
          label="Total Leads"
          value={formatNumber(marketingStats.leads.value)}
          icon={UserPlus}
          trend={marketingStats.leads.trend}
          sparkColor="#10B981"
        />
        <MetricCard
          label="MQLs"
          value={formatNumber(marketingStats.mqls.value)}
          icon={Target}
          trend={marketingStats.mqls.trend}
          sparkData={mqlTimeline.map((d) => d.value)}
          sparkColor="#8B5CF6"
        />
        <MetricCard
          label="Overall ROI"
          value={`${marketingStats.roi.value}%`}
          icon={TrendingUp}
          trend={marketingStats.roi.trend}
          sparkColor="#F59E0B"
        />
      </div>

      {/* Row 3: MQL Trend + Lead Funnel */}
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
                MQL Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={mqlTimeline}
                color="#8B5CF6"
                height={240}
                formatValue={(v) => v.toLocaleString()}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Lead Gen Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart data={leadFunnel} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 4: Campaign List + Channel Breakdown */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Campaign List */}
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground pb-2">Campaign</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Status</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">Leads</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">Spend</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => {
                      const config = statusConfig[c.status];
                      const StatusIcon = config.icon;
                      return (
                        <motion.tr
                          key={i}
                          className="border-b border-border/50 last:border-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 + i * 0.04 }}
                        >
                          <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                          <td className="py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                config.bg,
                                config.color
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-foreground">{formatNumber(c.leads)}</td>
                          <td className="py-2.5 text-right text-muted-foreground">
                            {formatCurrency(c.spend)}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={cn(
                                "font-semibold",
                                c.roi >= 4
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : c.roi >= 2.5
                                  ? "text-foreground"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {c.roi}x
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Channel Breakdown */}
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <MiniDonutChart
                data={channelBreakdown}
                centerValue="100%"
                centerLabel="Traffic"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 5: Content Performance + Upcoming Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Content Performance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground pb-2">Content</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Type</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">Views</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">Leads</th>
                      <th className="text-right font-medium text-muted-foreground pb-2">Conv%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentPerformance.map((c, i) => (
                      <motion.tr
                        key={i}
                        className="border-b border-border/50 last:border-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 + i * 0.04 }}
                      >
                        <td className="py-2.5 font-medium text-foreground max-w-[180px] truncate">
                          {c.title}
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {c.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-foreground">
                          {formatNumber(c.views)}
                        </td>
                        <td className="py-2.5 text-right text-foreground">{c.leads}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={cn(
                              "font-semibold",
                              c.convRate >= 5
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            )}
                          >
                            {c.convRate}%
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{event.date}</span>
                        <span className="text-xs text-muted-foreground/50">·</span>
                        <span className="text-xs text-muted-foreground">{event.type}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                        eventStatusColors[event.status]
                      )}
                    >
                      {event.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
