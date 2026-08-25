"use client";

import { useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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
  Activity,
  CalendarDays,
  CheckSquare,
  CheckCircle2,
  Clock,
  UserCheck,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
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
  { title: "Calendar", description: "Schedule & meetings", href: "/calendar", icon: CalendarDays },
  { title: "Tasks", description: "Follow-ups & to-dos", href: "/crm/tasks", icon: CheckSquare },
  { title: "Reports", description: "Analytics & insights", href: "/crm/reports", icon: BarChart3 },
] as const;

const REDUCED_CONTAINER: Variants = { hidden: {}, visible: {} };
const REDUCED_ITEM: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

export default function CrmHubPage() {
  const prefersReducedMotion = useReducedMotion();
  const containerVariants = prefersReducedMotion ? REDUCED_CONTAINER : staggerContainer;
  const itemVariants = prefersReducedMotion ? REDUCED_ITEM : fadeUp;

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
  const { data: contactsData, isLoading: contactsLoading } = useContacts({ limit: 1 });
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
      <PageWrapper title="CRM" subtitle="Command center" variant="display">
        <div className="space-y-4 pb-4">
          <StatCardGrid cols={4}>
            {Array.from({ length: 8 }).map((_, i) => (
              <StatCard key={i} isLoading label="" value="" />
            ))}
          </StatCardGrid>

          <div className="flex items-center gap-4 flex-wrap px-1">
            {Array.from({ length: 10 }).map((_, i) => (
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
            {Array.from({ length: 10 }).map((_, i) => (
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
      <PageWrapper title="CRM" subtitle="Command center" variant="display">
        <ErrorState
          title="Failed to load CRM data"
          description="Something went wrong while loading your dashboard. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle="Command center" variant="display">
      <motion.div
        className="space-y-4 pb-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCardGrid cols={4}>
            <StatCard
              label="Total Leads"
              value={leadStats?.total ?? 0}
              icon={UserPlus}
              tone="blue"
              href="/crm/leads"
            />
            <StatCard
              label="Qualified"
              value={leadStats?.byStatus.QUALIFIED ?? 0}
              icon={CheckCircle2}
              tone="emerald"
              href="/crm/leads"
            />
            <StatCard
              label="Pipeline Value"
              value={formatINRCompact(dealStats?.pipelineValue ?? 0)}
              icon={IndianRupee}
              tone="blue"
              href="/crm/deals"
            />
            <StatCard
              label="Open Deals"
              value={dealStats?.active ?? 0}
              icon={Briefcase}
              tone="amber"
              href="/crm/deals"
            />
            <StatCard
              label="Won Deals"
              value={wonCount}
              icon={TrendingUp}
              tone="emerald"
              href="/crm/deals"
            />
            <StatCard
              label="Lost Deals"
              value={lostCount}
              icon={TrendingDown}
              tone="red"
              href="/crm/deals"
            />
            <StatCard
              label="Tasks Due"
              value={tasksDue}
              icon={Clock}
              tone="amber"
              href="/crm/tasks"
            />
            <StatCard
              label="Win Rate"
              value={`${winRate}%`}
              icon={BarChart3}
              tone={winRate >= 50 ? "emerald" : "blue"}
              href="/crm/reports"
            />
          </StatCardGrid>
        </motion.div>

        {leadStats && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-4 flex-wrap text-dense px-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-muted-foreground">Unassigned</span>
                <span className="font-bold text-red-400">{leadStats.unassigned}</span>
              </div>
              <div>
                <span className="text-muted-foreground">New/Mo</span>{" "}
                <span className="font-bold ml-1">{leadStats.thisMonth}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pipeline</span>{" "}
                <span className="font-bold text-primary ml-1">
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
                <span className="font-bold ml-1">{contactsData?.total ?? 0}</span>
              </div>
            </div>
          </motion.div>
        )}

        {leadStats && (
          <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-2">
            <CrmPipelineMini
              byStatus={leadStats.byStatus}
              total={leadStats.total}
            />
            <CrmRecentActivity deals={allDeals ?? []} />
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          className="grid gap-2 grid-cols-2 md:grid-cols-4"
        >
          {NAV_CARDS.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="shadow-sm hover:shadow-md transition-all hover:border-primary/40 cursor-pointer group h-full">
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div className="w-8 rounded-md flex items-center justify-center shrink-0 bg-muted">
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      {card.title}
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary" />
                    </p>
                    <CardDescription className="text-micro truncate">
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
