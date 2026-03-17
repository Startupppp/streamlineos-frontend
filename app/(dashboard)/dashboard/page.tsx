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
  Contact2,
  Ticket,
} from "lucide-react";
import { AlertCircle } from "lucide-react";
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
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { QuickActions } from "./_components/quick-actions";
import { SprintCard } from "./_components/sprint-card";
import { TeamCard } from "./_components/team-card";
import { MyIssuesCard, type DashboardTicket } from "./_components/my-issues-card";
import { RecentProjectsCard } from "./_components/recent-projects-card";
import { RecentActivityCard } from "./_components/recent-activity-card";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR";
  // All roles now have access to projects and tickets

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  // Only fetch admin-level data for CEO/HR
  const { data: recentProjects, isLoading: projectsLoading, error: projectsError } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  // Fetch tickets/sprint for project roles and admins
  const { data: myTicketsData, isLoading: ticketsLoading, error: ticketsError } = useEmployeeTickets(currentUserId ?? "");
  const { data: sprintSummary, isLoading: sprintLoading } = useActiveSprintSummary();

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(() => format(new Date(), "EEEE, MMMM do, yyyy"), []);

  const handleGoToDashboard = useCallback(() => router.push("/dashboard"), [router]);
  const handleGoToProjects = useCallback(() => router.push("/projects"), [router]);

  // Role-specific stat cards
  const statCards = useMemo(() => {
    if (!stats) return [];

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
          { id: "org", label: "Welcome", value: stats.orgName, icon: Building2 },
          { id: "leads", label: "My Leads", value: "View", icon: Contact2, href: "/crm/leads" },
        ];
      case "CUSTOMER_SUPPORT":
        return [
          { id: "org", label: "Welcome", value: stats.orgName, icon: Building2 },
          { id: "tickets", label: "My Tickets", value: "View", icon: Ticket, href: "/support" },
        ];
      case "ENGINEERING":
      case "DESIGN":
      case "VIDEO_EDITOR":
      case "DIGITAL_MARKETING":
        return [
          { id: "projects", label: "My Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
      default:
        return [
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
    }
  }, [stats, role]);

  const sortedMyTickets = useMemo((): DashboardTicket[] => {
    const raw = myTicketsData?.data ?? [];
    const toDashboardTicket = (t: (typeof raw)[number]): DashboardTicket => ({
      id: t.id,
      type: t.type,
      status: t.status,
      ticketNumber: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      project: t.project ?? null,
    });
    const inProgress = raw.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
    const todo = raw.filter((t) => t.status === "TODO" || t.status === "BACKLOG");
    return [...inProgress, ...todo].map(toDashboardTicket);
  }, [myTicketsData]);

  if (isLoading) {
    return (
      <div className="space-y-8" role="status" aria-live="polite" aria-label="Loading dashboard">
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

      <motion.div variants={fadeUp} className={`grid gap-4 ${statCards.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : statCards.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
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

      <motion.div variants={fadeUp}>
        <QuickActions />
      </motion.div>

      {/* My Issues + Sprint — shown to all roles */}
      <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
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

      {/* Projects, Activity, Team — CEO/HR only */}
      {isAdmin && (
        <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
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
      )}
    </motion.div>
  );
}
