"use client";

import { useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  ArrowRight,
  UserPlus,
  IndianRupee,
  AlertTriangle,
  Briefcase,
  RefreshCw,
  Activity,
  CalendarDays,
  CheckSquare,
  CheckCircle2,
  Clock,
  UserCheck,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { useLeadStats } from "@/hooks/api/leads";
import { useDeals, useDealStats, useContacts, useWinLossAnalysis } from "@/hooks/api/crm";
import { useTasks } from "@/hooks/api/tasks";
import { CrmPipelineMini } from "@/features/crm/shared/crm-pipeline-mini";
import { CrmRecentActivity } from "@/features/crm/shared/crm-recent-activity";

const NAV_CARDS = [
  { title: "Leads", description: "Pipeline tracking", href: "/crm/leads", icon: UserPlus },
  { title: "Contacts", description: "People directory", href: "/crm/contacts", icon: Users },
  { title: "Companies", description: "Organizations & accounts", href: "/crm/companies", icon: Building2 },
  { title: "Clients", description: "Account management", href: "/crm/clients", icon: UserCheck },
  { title: "Deals", description: "Pipeline to close", href: "/crm/deals", icon: Briefcase },
  { title: "Quotes", description: "Proposals & pricing", href: "/crm/quotes", icon: FileText },
  { title: "Activities", description: "Calls, emails & meetings", href: "/crm/activities", icon: Activity },
  { title: "Calendar", description: "Schedule & meetings", href: "/crm/calendar", icon: CalendarDays },
  { title: "Tasks", description: "Follow-ups & to-dos", href: "/crm/tasks", icon: CheckSquare },
  { title: "Reports", description: "Analytics & insights", href: "/crm/reports", icon: BarChart3 },
] as const;

export default function CrmHubPage() {
  const {
    data: leadStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useLeadStats();
  const {
    data: dealStats,
    isLoading: dealsLoading,
    error: dealsError,
  } = useDealStats();
  const { data: allDeals, isLoading: activityLoading } = useDeals({ limit: 6 });
  const { data: contactsData, isLoading: contactsLoading } = useContacts({
    limit: 1,
  });
  const { data: winLoss, isLoading: winLossLoading } = useWinLossAnalysis();
  const { data: pendingTasks, isLoading: tasksLoading } = useTasks({
    status: "pending",
    limit: 1,
  });

  const isLoading =
    statsLoading ||
    dealsLoading ||
    activityLoading ||
    contactsLoading ||
    winLossLoading ||
    tasksLoading;
  const error = statsError ?? dealsError;

  const wonCount = winLoss?.summary.won ?? 0;
  const lostCount = winLoss?.summary.lost ?? 0;
  const winRate = winLoss?.summary.winRate ?? 0;
  const tasksDue = pendingTasks?.total ?? 0;

  const handleRetry = useCallback(() => {
    void refetchStats();
  }, [refetchStats]);

  if (isLoading) {
    return (
      <PageWrapper title="CRM" subtitle="Command center">
        <div className="space-y-4 pb-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-24" />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="CRM" subtitle="Command center">
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load CRM data"}
              </p>
              <Button onClick={handleRetry} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle="Command center">
      <motion.div
        className="space-y-4 pb-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={fadeUp}
          className="grid gap-3 grid-cols-2 md:grid-cols-4"
        >
          <StatCard
            label="Total Leads"
            value={leadStats?.total ?? 0}
            icon={UserPlus}
            color="blue"
            index={0}
            href="/crm/leads"
          />
          <StatCard
            label="Qualified"
            value={leadStats?.byStatus.QUALIFIED ?? 0}
            icon={CheckCircle2}
            color="green"
            index={1}
            href="/crm/leads"
          />
          <StatCard
            label="Pipeline Value"
            value={formatINRCompact(dealStats?.pipelineValue ?? 0)}
            icon={IndianRupee}
            color="cyan"
            index={2}
            href="/crm/deals"
          />
          <StatCard
            label="Open Deals"
            value={dealStats?.active ?? 0}
            icon={Briefcase}
            color="amber"
            index={3}
            href="/crm/deals"
          />
          <StatCard
            label="Won Deals"
            value={wonCount}
            icon={TrendingUp}
            color="green"
            index={4}
            href="/crm/deals"
          />
          <StatCard
            label="Lost Deals"
            value={lostCount}
            icon={TrendingDown}
            color="red"
            index={5}
            href="/crm/deals"
          />
          <StatCard
            label="Tasks Due"
            value={tasksDue}
            icon={Clock}
            color="amber"
            index={6}
            href="/crm/tasks"
          />
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            icon={BarChart3}
            color={winRate >= 50 ? "green" : "violet"}
            index={7}
            href="/crm/reports"
          />
        </motion.div>

        {leadStats && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-4 flex-wrap text-[11px] px-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-muted-foreground">Unassigned</span>
                <span className="font-bold text-red-400">
                  {leadStats.unassigned}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">New/Mo</span>{" "}
                <span className="font-bold ml-1">{leadStats.thisMonth}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pipeline</span>{" "}
                <span className="font-bold text-blue-600 ml-1">
                  {formatINRCompact(leadStats.totalPotentialValue)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Won</span>{" "}
                <span className="font-bold text-emerald-400 ml-1">
                  {formatINRCompact(dealStats?.wonValue ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Contacts</span>{" "}
                <span className="font-bold ml-1">
                  {contactsData?.total ?? 0}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {leadStats && (
          <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2">
            <CrmPipelineMini
              byStatus={leadStats.byStatus}
              total={leadStats.total}
            />
            <CrmRecentActivity deals={allDeals ?? []} />
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="grid gap-2 grid-cols-2 md:grid-cols-4"
        >
          {NAV_CARDS.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="shadow-sm hover:shadow-md transition-all hover:border-blue-500/40 cursor-pointer group h-full">
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-muted">
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      {card.title}
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-blue-600" />
                    </p>
                    <CardDescription className="text-[10px] truncate">
                      {card.description}
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
