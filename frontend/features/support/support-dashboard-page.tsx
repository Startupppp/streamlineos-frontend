"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { SupportTeamMember } from "@/types/crm/contacts";
import {
  Ticket,
  Clock,
  Star,
  Zap,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { useSupportDashboard } from "@/hooks/api";
import { useMotionVariants } from "@/lib/motion-variants";
import { safeMax, calcPercent } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors, sparkColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const formatTicketValue = (v: number) => v.toLocaleString();

const TEAM_COLUMNS: DataTableColumn<SupportTeamMember>[] = [
  {
    key: "name",
    header: "Name",
    cell: (member) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{member.avatar}</span>
        </div>
        <span className="font-medium text-foreground">{member.name}</span>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    className: "text-muted-foreground",
    cell: (member) => member.role,
  },
  {
    key: "access",
    header: "Access",
    cell: (member) => (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        {member.access}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (member) => <TeamMemberStatus member={member} />,
  },
];

function TeamMemberStatus({ member }: { member: SupportTeamMember }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", getColorSafe(onlineStatusColors, member.status))} />
      <span className="text-xs capitalize text-muted-foreground">{member.status}</span>
    </div>
  );
}

function getTeamMemberKey(member: SupportTeamMember) {
  return member.name;
}

export function SupportDashboardPage() {
  const { staggerContainer, fadeUp, slideInLeft } = useMotionVariants();
  const { data, isLoading, isError, refetch } = useSupportDashboard();

  const ticketStatusBreakdown = useMemo(() => data?.ticketStatusBreakdown ?? [], [data]);
  const ticketVolumeTimeline = data?.ticketVolumeTimeline ?? [];
  const supportActivityFeed = data?.supportActivityFeed ?? [];
  const supportTeamMembers = data?.supportTeamMembers ?? [];
  const ticketsByPriority = useMemo(() => data?.ticketsByPriority ?? [], [data]);

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

  function handleRetry() {
    void refetch();
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
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper
        title="Support Analytics"
        subtitle="Real-time insights into customer support performance across all channels"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGridSkeleton cols={4} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            <Skeleton className="h-72 lg:col-span-5" />
            <Skeleton className="h-72 lg:col-span-7" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper
        title="Support Analytics"
        subtitle="Real-time insights into customer support performance across all channels"
      >
        <EmptyState
          illustrationPreset="ticket"
          title="No support activity yet"
          description="Analytics appear once your first tickets are raised."
          action={{ label: "Go to ticket inbox", href: "/support/inbox" }}
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
      className="flex flex-1 min-h-0 flex-col gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp}>
        <StatCardGrid cols={4}>
          <StatCard
            label="Open Tickets"
            value={supportDashboardStats.openTickets.value}
            icon={Ticket}
            trend={supportDashboardStats.openTickets.trend}
            sparkColor={sparkColors.blue}
            tone="blue"
          />
          <StatCard
            label="Avg Resolution Time"
            value={supportDashboardStats.avgResolution.value}
            icon={Clock}
            trend={supportDashboardStats.avgResolution.trend}
            sparkColor={sparkColors.amber}
            tone="amber"
          />
          <StatCard
            label="CSAT Score"
            value={supportDashboardStats.csatScore.value}
            icon={Star}
            trend={supportDashboardStats.csatScore.trend}
            sparkColor={sparkColors.green}
            tone="emerald"
          />
          <StatCard
            label="Response Rate"
            value={supportDashboardStats.responseRate.value}
            icon={Zap}
            trend={supportDashboardStats.responseRate.trend}
            sparkColor={sparkColors.blue}
            tone="blue"
          />
        </StatCardGrid>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
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
                <Ticket className="h-4 w-4 text-primary" />
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
            <CardContent className="p-0">
              <DataTable
                data={supportTeamMembers}
                columns={TEAM_COLUMNS}
                getRowKey={getTeamMemberKey}
                className="border-0 rounded-none"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
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
