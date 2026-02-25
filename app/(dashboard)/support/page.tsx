"use client";

import { motion } from "framer-motion";
import {
  Ticket,
  Clock,
  Star,
  Zap,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/crm/metric-card";
import { MiniAreaChart } from "@/components/crm/mini-area-chart";
import { MiniDonutChart } from "@/components/crm/mini-donut-chart";
import { ActivityFeed } from "@/components/crm/activity-feed";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  supportDashboardStats,
  ticketStatusBreakdown,
  ticketVolumeTimeline,
  supportActivityFeed,
  supportTeamMembers,
  ticketsByPriority,
} from "@/lib/data/crm-mock-data";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

const statusIndicator: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400 dark:bg-slate-600",
};

export default function SupportDashboardPage() {
  const totalTickets = ticketStatusBreakdown.reduce((sum, s) => sum + s.value, 0);
  const totalPriority = ticketsByPriority.reduce((sum, p) => sum + p.value, 0);
  const maxPriorityValue = Math.max(...ticketsByPriority.map((p) => p.value));

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Support Analytics"
          description="Real-time insights into customer support performance across all channels"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open Tickets"
          value={supportDashboardStats.openTickets.value}
          icon={Ticket}
          trend={supportDashboardStats.openTickets.trend}
          sparkColor="#3B82F6"
        />
        <MetricCard
          label="Avg Resolution Time"
          value={supportDashboardStats.avgResolution.value}
          icon={Clock}
          trend={supportDashboardStats.avgResolution.trend}
          sparkColor="#F59E0B"
        />
        <MetricCard
          label="CSAT Score"
          value={supportDashboardStats.csatScore.value}
          icon={Star}
          trend={supportDashboardStats.csatScore.trend}
          sparkColor="#10B981"
        />
        <MetricCard
          label="Response Rate"
          value={supportDashboardStats.responseRate.value}
          icon={Zap}
          trend={supportDashboardStats.responseRate.trend}
          sparkColor="#8B5CF6"
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                Ticket Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <MiniDonutChart
                data={ticketStatusBreakdown}
                centerValue={totalTickets}
                centerLabel="Total"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-7" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4 text-gold" />
                Ticket Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={ticketVolumeTimeline}
                color="#3B82F6"
                height={240}
                formatValue={(v) => v.toLocaleString()}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: "380px" }}>
                <ActivityFeed items={supportActivityFeed} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Team Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground pb-2">Name</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Role</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Access</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTeamMembers.map((member, i) => (
                      <motion.tr
                        key={i}
                        className="border-b border-border/50 last:border-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.04 }}
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-gold">
                                {member.avatar}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{member.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{member.role}</td>
                        <td className="py-2.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {member.access}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                statusIndicator[member.status] || "bg-slate-400"
                              )}
                            />
                            <span className="text-xs capitalize text-muted-foreground">
                              {member.status}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              Tickets by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketsByPriority.map((priority, i) => {
                const percentage = totalPriority > 0
                  ? ((priority.value / totalPriority) * 100).toFixed(1)
                  : "0";

                return (
                  <motion.div
                    key={priority.label}
                    className="relative overflow-hidden rounded-xl border border-border p-4"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.06 }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundColor: priority.color }}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: priority.color }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {priority.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            {priority.value}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: priority.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(priority.value / maxPriorityValue) * 100}%`,
                          }}
                          transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
