"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  Clock,
  Star,
  Zap,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { useSupportDashboard } from "@/lib/api/hooks";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import { safeMax, calcPercent } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors, sparkColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/shared/error-state";

const formatTicketValue = (v: number) => v.toLocaleString();

export default function SupportDashboardPage() {
  const { data, isLoading, isError, refetch } = useSupportDashboard();

  const ticketStatusBreakdown = data?.ticketStatusBreakdown ?? [];
  const ticketVolumeTimeline = data?.ticketVolumeTimeline ?? [];
  const supportActivityFeed = data?.supportActivityFeed ?? [];
  const supportTeamMembers = data?.supportTeamMembers ?? [];
  const ticketsByPriority = data?.ticketsByPriority ?? [];

  const totalTickets = useMemo(
    () => ticketStatusBreakdown.reduce((sum, s) => sum + s.value, 0),
    [ticketStatusBreakdown],
  );
  const totalPriority = useMemo(
    () => ticketsByPriority.reduce((sum, p) => sum + p.value, 0),
    [ticketsByPriority],
  );
  const maxPriorityValue = useMemo(
    () => safeMax(ticketsByPriority.map((p) => p.value)),
    [ticketsByPriority],
  );

  if (isLoading || !data) {
    return (
      <PageWrapper
        title="Support Analytics"
        subtitle="Real-time insights into customer support performance across all channels"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            <Skeleton className="h-72 lg:col-span-5" />
            <Skeleton className="h-72 lg:col-span-7" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Support Analytics"
        subtitle="Real-time insights into customer support performance across all channels"
      >
        <ErrorState
          title="Failed to load support analytics"
          description="We couldn't load the dashboard data. Please try again."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  const { supportDashboardStats } = data;

  return (
    <PageWrapper
      title="Support Analytics"
      subtitle="Real-time insights into customer support performance across all channels"
    >
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open Tickets"
          value={supportDashboardStats.openTickets.value}
          icon={Ticket}
          trend={supportDashboardStats.openTickets.trend}
          sparkColor={sparkColors.blue}
        />
        <MetricCard
          label="Avg Resolution Time"
          value={supportDashboardStats.avgResolution.value}
          icon={Clock}
          trend={supportDashboardStats.avgResolution.trend}
          sparkColor={sparkColors.amber}
        />
        <MetricCard
          label="CSAT Score"
          value={supportDashboardStats.csatScore.value}
          icon={Star}
          trend={supportDashboardStats.csatScore.trend}
          sparkColor={sparkColors.green}
        />
        <MetricCard
          label="Response Rate"
          value={supportDashboardStats.responseRate.value}
          icon={Zap}
          trend={supportDashboardStats.responseRate.trend}
          sparkColor={sparkColors.purple}
        />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
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
                <Ticket className="h-4 w-4 text-blue-600" />
                Ticket Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={ticketVolumeTimeline}
                color={sparkColors.blue}
                height={240}
                formatValue={formatTicketValue}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px] pr-1">
                <ActivityFeed items={supportActivityFeed} />
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Team Access</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full max-h-[60vh]" type="auto">
              <div className="min-w-[400px]">
                <table className="w-full text-sm">
                  <caption className="sr-only">Support team members with roles, access levels, and online status</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Name</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Role</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Access</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTeamMembers.map((member) => (
                      <motion.tr
                        key={member.name}
                        className="border-b border-border/50 last:border-0"
                        variants={fadeUp}
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-blue-600">
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
                                getColorSafe(onlineStatusColors, member.status)
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
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Tickets by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ticketsByPriority.map((priority) => {
                const percentage = calcPercent(priority.value, totalPriority);

                return (
                  <motion.div
                    key={priority.label}
                    className="relative overflow-hidden rounded-xl border border-border p-3"
                    variants={slideInLeft}
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
                          transition={{ duration: 0.6, delay: 0.4 }}
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
    </PageWrapper>
  );
}
