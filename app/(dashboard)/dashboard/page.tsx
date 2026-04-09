"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useActiveSprintSummary,
  useRecentActivity,
  useRoleStats,
  useTodayActivities,
} from "@/lib/api/hooks/dashboard";
import { useMyIssues } from "@/lib/api/hooks/dashboard";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/api/hooks/notifications";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  RefreshCw,
  Contact2,
  Ticket,
  Target,
  TrendingUp,
  CheckCircle2,
  ListChecks,
  Zap,
} from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { SprintCard } from "@/features/dashboard/sprint-card";
import { TeamCard } from "@/features/dashboard/team-card";
import { MyIssuesCard, type DashboardTicket } from "@/features/dashboard/my-issues-card";
import { RecentProjectsCard } from "@/features/dashboard/recent-projects-card";
import { RecentActivityCard } from "@/features/dashboard/recent-activity-card";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR";

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading, error: projectsError } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  const { data: myIssuesData, isLoading: ticketsLoading, error: ticketsError } = useMyIssues(
    currentUserId ?? "",
  );

  const { data: sprintSummary, isLoading: sprintLoading } = useActiveSprintSummary();

  const { data: roleStats } = useRoleStats();
  const { data: todayActivities } = useTodayActivities();

  const prevUnreadRef = useRef<number | null>(null);
  const { data: unreadData } = useUnreadNotificationCount({
    refetchInterval: 15000,
  });
  const { data: latestNotifications } = useNotifications(true, 5, {
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (unreadData === undefined) return;
    const currentCount = unreadData.count ?? 0;
    if (prevUnreadRef.current !== null && currentCount > prevUnreadRef.current && latestNotifications) {
      const newOnes = latestNotifications.slice(0, currentCount - prevUnreadRef.current);
      for (const n of newOnes) {
        toast(n.title, { description: n.message ?? undefined, duration: 5000 });
      }
    }
    prevUnreadRef.current = currentCount;
  }, [unreadData, latestNotifications]);

  const shownMeetingToastRef = useRef(false);
  useEffect(() => {
    if (todayActivities && todayActivities.length > 0 && !shownMeetingToastRef.current) {
      shownMeetingToastRef.current = true;
      if (todayActivities.length === 1) {
        const a = todayActivities[0];
        toast.info(`You have a scheduled ${a.type} today: ${a.subject || "No subject"}`, { duration: 6000 });
      } else {
        toast.info(`You have ${todayActivities.length} scheduled meetings/calls today`, { duration: 6000 });
      }
    }
  }, [todayActivities]);

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(() => format(new Date(), "EEEE, MMMM do, yyyy"), []);

  const handleGoToDashboard = useCallback(() => router.push("/dashboard"), [router]);
  const handleGoToProjects = useCallback(() => router.push("/projects"), [router]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    const rs = roleStats as Record<string, number> | undefined;

    switch (role) {
      case "CEO":
        return [
          { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
          { id: "projects", label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
      case "HR":
        return [
          { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
          { id: "projects", label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
      case "SALES":
        return [
          { id: "leads", label: "My Leads", value: rs?.myLeads ?? 0, icon: Contact2, href: "/crm/leads" },
          { id: "converted", label: "Converted", value: rs?.myConverted ?? 0, icon: TrendingUp, href: "/crm/leads" },
          { id: "deals", label: "My Deals", value: rs?.myDeals ?? 0, icon: Zap, href: "/crm/deals" },
          { id: "target", label: "Target Progress", value: `${rs?.targetProgress ?? 0}%`, icon: Target, href: "/crm/targets" },
        ];
      case "CUSTOMER_SUPPORT":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
          { id: "tickets", label: "My Tickets", value: rs?.myTickets ?? 0, icon: Ticket },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: ListChecks },
        ];
      case "ENGINEERING":
      case "DESIGN":
      case "VIDEO_EDITOR":
      case "DIGITAL_MARKETING":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
          { id: "tickets", label: "My Tasks", value: rs?.myTickets ?? 0, icon: ListChecks },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: Zap },
        ];
      default:
        return [
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
    }
  }, [stats, role, roleStats]);

  const sortedMyTickets = useMemo((): DashboardTicket[] => {
    const raw = myIssuesData ?? [];
    const toDashboardTicket = (t: (typeof raw)[number]): DashboardTicket => ({
      id: t.id,
      type: t.type,
      status: t.status,
      ticketNumber: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      project: t.projectId != null
        ? { id: t.projectId, name: t.projectName, key: t.projectKey }
        : null,
    });
    const inProgress = raw.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
    const todo = raw.filter((t) => t.status === "TODO" || t.status === "BACKLOG");
    return [...inProgress, ...todo].map(toDashboardTicket);
  }, [myIssuesData]);

  if (isLoading) {
    return (
      <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading dashboard">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-14 w-32 rounded-lg" />
        </div>
        <DashboardStatsSkeleton />
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4 bg-card border-border">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
          <Card className="lg:col-span-3 bg-card border-border">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8" role="alert">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error instanceof Error ? error.message : "Failed to load dashboard stats"}</span>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={Building2}
          title="No data available"
          description="Dashboard statistics are not available. Please try refreshing."
          action={{
            label: "Refresh",
            onClick: handleGoToDashboard,
          }}
        />
      </div>
    );
  }

  return (
    <PageWrapper
      title={`${greeting}, ${firstName}`}
      subtitle={`${todayFormatted} · ${stats.orgName}`}
      actions={<ClockInWidget />}
    >
      <div className="space-y-5">

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className={`grid gap-4 grid-cols-1 ${statCards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : statCards.length >= 3 ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2"}`}>
        {statCards.map((stat, i) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            href={stat.href}
            index={i}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <QuickActions />
      </motion.div>

      {/* Public Documents — visible to all roles */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PublicDocumentsCard />
      </motion.div>

      {/* My Issues + Sprint — shown to all roles */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="grid gap-4 grid-cols-1 lg:grid-cols-7 md:auto-rows-[24rem]">
        <div className="lg:col-span-4 min-h-0">
          <MyIssuesCard
            tickets={sortedMyTickets}
            isLoading={ticketsLoading}
            error={ticketsError}
          />
        </div>
        <div className="lg:col-span-3 min-h-0">
          <SprintCard summary={sprintSummary ?? undefined} isLoading={sprintLoading} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className={`grid gap-4 grid-cols-1 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"} md:auto-rows-[24rem]`}>
        <div className="sm:col-span-1 min-h-0">
          <RecentProjectsCard
            projects={recentProjects?.map((p) => ({ ...p, key: p.key ?? "" }))}
            isLoading={projectsLoading}
            error={projectsError}
            onCreateProject={handleGoToProjects}
          />
        </div>
        <div className="sm:col-span-1 min-h-0">
          <RecentActivityCard
            items={recentActivity}
            isLoading={activityLoading}
            error={activityError}
          />
        </div>
        {isAdmin && (
          <div className="sm:col-span-2 lg:col-span-1 min-h-0">
            <TeamCard members={teamAvailability} isLoading={teamLoading} />
          </div>
        )}
      </motion.div>

      </div>
    </PageWrapper>
  );
}
