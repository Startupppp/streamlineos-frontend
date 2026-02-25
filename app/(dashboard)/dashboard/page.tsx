"use client";

import { useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useEmployeeTickets,
  useActiveSprintSummary,
  useRecentActivity,
} from "@/lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import { ErrorMessage } from "@/components/pre-ui/error-message";
import { Button } from "@/components/ui/button";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { QuickActions } from "./_components/quick-actions";
import { SprintCard } from "./_components/sprint-card";
import { TeamCard } from "./_components/team-card";
import { MyIssuesCard, type DashboardTicket } from "./_components/my-issues-card";
import { RecentProjectsCard } from "./_components/recent-projects-card";
import { RecentActivityCard } from "./_components/recent-activity-card";

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const firstName = userName.split(" ")[0] || "User";

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading, error: projectsError } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: myTicketsData, isLoading: ticketsLoading, error: ticketsError } = useEmployeeTickets(currentUserId || "");
  const { data: sprintSummary, isLoading: sprintLoading } = useActiveSprintSummary();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(() => format(new Date(), "EEEE, MMMM do, yyyy"), []);

  const handleGoToOrgSelection = useCallback(() => router.push("/org-selection"), [router]);
  const handleGoToProjects = useCallback(() => router.push("/projects"), [router]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
      { label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
      { label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
      { label: "Organization", value: stats.orgName, icon: Building2 },
    ];
  }, [stats]);

  const sortedMyTickets = useMemo((): DashboardTicket[] => {
    const raw = myTicketsData?.data || [];
    const inProgress = raw.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
    const todo = raw.filter((t) => t.status === "TODO" || t.status === "BACKLOG");
    return [...inProgress, ...todo] as DashboardTicket[];
  }, [myTicketsData]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-14 w-32 rounded-lg" />
        </div>
        <DashboardStatsSkeleton />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 bg-card border-border">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
          <Card className="col-span-3 bg-card border-border">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <ErrorMessage message={error.message || "Failed to load dashboard stats"} />
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
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
          title="No organization selected"
          description="Please select an organization to view dashboard statistics."
          action={{
            label: "Select Organization",
            onClick: handleGoToOrgSelection,
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <PageHeader
            title={`${greeting}, ${firstName}`}
            description={`Overview for ${stats.orgName}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {todayFormatted}
          </p>
        </div>
        <ClockInWidget />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            href={stat.href}
            index={i}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        <QuickActions />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2 lg:grid-cols-7" aria-live="polite" aria-atomic="false">
        <div className="lg:col-span-4">
          <MyIssuesCard
            tickets={sortedMyTickets}
            isLoading={ticketsLoading}
            error={ticketsError}
          />
        </div>
        <div className="lg:col-span-3">
          <SprintCard summary={sprintSummary ?? undefined} isLoading={sprintLoading} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2 lg:grid-cols-12" aria-live="polite" aria-atomic="false">
        <div className="lg:col-span-4">
          <RecentProjectsCard
            projects={recentProjects}
            isLoading={projectsLoading}
            error={projectsError}
            onCreateProject={handleGoToProjects}
          />
        </div>
        <div className="lg:col-span-4">
          <RecentActivityCard
            items={recentActivity}
            isLoading={activityLoading}
            error={activityError}
          />
        </div>
        <div className="lg:col-span-4">
          <TeamCard members={teamAvailability} isLoading={teamLoading} />
        </div>
      </motion.div>
    </motion.div>
  );
}
