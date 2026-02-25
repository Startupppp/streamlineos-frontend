"use client";

import { useSession } from "next-auth/react";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useEmployeeTickets,
  useActiveSprintSummary,
  useRecentActivity,
} from "@/lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  Folder,
  ListTodo,
  Activity,
  Bug,
  BookOpen,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { ErrorMessage } from "@/components/pre-ui/error-message";
import { Button } from "@/components/ui/button";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import {
  EmptyTasksIllustration,
  EmptyProjectsIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { getInitials } from "@/lib/format-utils";
import { QuickActions } from "./_components/quick-actions";
import { SprintCard } from "./_components/sprint-card";
import { TeamCard } from "./_components/team-card";

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-700",
  HIGH: "bg-orange-500/10 text-orange-700",
  MEDIUM: "bg-yellow-500/10 text-yellow-700",
  LOW: "bg-slate-500/10 text-slate-700",
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  BUG: Bug,
  STORY: BookOpen,
  TASK: CheckCircle2,
  EPIC: Activity,
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700",
  PLANNING: "bg-blue-500/10 text-blue-700",
  COMPLETED: "bg-slate-500/10 text-slate-700",
  ON_HOLD: "bg-amber-500/10 text-amber-700",
};

interface TicketProject {
  key?: string;
  name?: string;
  id?: number;
}

const getTicketProject = (ticket: unknown): TicketProject => {
  const t = ticket as { project?: TicketProject };
  return t.project || {};
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "";
  const firstName = userName.split(" ")[0];

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: myTicketsData, isLoading: ticketsLoading } = useEmployeeTickets(currentUserId || "");
  const { data: sprintSummary, isLoading: sprintLoading } = useActiveSprintSummary();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();

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
            onClick: () => (window.location.href = "/org-selection"),
          }}
        />
      </div>
    );
  }

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
    { label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
    { label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
    { label: "Organization", value: stats.orgName, icon: Building2 },
  ];

  const myTickets = myTicketsData?.data || [];
  const inProgressTickets = myTickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
  const todoTickets = myTickets.filter((t) => t.status === "TODO" || t.status === "BACKLOG");
  const sortedMyTickets = [...inProgressTickets, ...todoTickets];

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
            title={`${getGreeting()}, ${firstName}`}
            description={`Overview for ${stats.orgName}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
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

      <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-border shadow-noir flex flex-col" style={{ maxHeight: "420px" }}>
          <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
            <CardTitle className="text-foreground flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-gold" />
              My Issues
            </CardTitle>
            <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">
              {sortedMyTickets.length} open
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : sortedMyTickets.length > 0 ? (
              <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: "100%" }}>
                {sortedMyTickets.slice(0, 10).map((ticket) => {
                  const TypeIcon = typeIcons[ticket.type || "TASK"] || CheckCircle2;
                  const project = getTicketProject(ticket);
                  return (
                    <Link key={ticket.id} href={project.id ? `/projects/${project.id}` : "#"}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 hover:border-gold/30 transition-colors cursor-pointer">
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {project.key}-{ticket.ticketNumber}
                            </span>
                            <span className="font-medium text-sm text-foreground truncate">{ticket.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{project.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={priorityColors[ticket.priority || "MEDIUM"]}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant={ticket.status === "IN_PROGRESS" || ticket.status === "IN_REVIEW" ? "default" : "secondary"} className="text-xs">
                            {ticket.status?.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                illustration={<EmptyTasksIllustration />}
                title="No assigned issues"
                description="Issues assigned to you will appear here."
              />
            )}
          </CardContent>
        </Card>

        <SprintCard summary={sprintSummary ?? undefined} isLoading={sprintLoading} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4 bg-card border-border shadow-noir">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Folder className="h-5 w-5 text-gold" />
              Recent Projects
            </CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="hover:bg-gold/10 hover:text-gold">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-gold/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.key}</p>
                        </div>
                      </div>
                      <Badge className={statusColors[project.status || "ACTIVE"] || statusColors.ACTIVE}>
                        {project.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration={<EmptyProjectsIllustration />}
                title="No recent projects"
                description="Create your first project to start tracking work."
                action={{
                  label: "Create Project",
                  onClick: () => (window.location.href = "/projects"),
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 bg-card border-border shadow-noir flex flex-col" style={{ maxHeight: "420px" }}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-gold" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: "100%" }}>
                {recentActivity.map((item) => {
                  const TypeIcon = typeIcons[item.type || "TASK"] || CheckCircle2;
                  return (
                    <Link key={item.id} href={item.projectId ? `/projects/${item.projectId}` : "#"}>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <TypeIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.projectKey}-{item.ticketNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.status?.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{item.projectName}</span>
                            {item.updatedAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.assignee && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={resolveImageUrl(item.assignee.image)} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(null, item.assignee.firstName, item.assignee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                illustration={<EmptyActivityIllustration />}
                title="No recent activity"
                description="Ticket updates will appear here as your team works."
              />
            )}
          </CardContent>
        </Card>

        <TeamCard members={teamAvailability} isLoading={teamLoading} />
      </motion.div>
    </motion.div>
  );
}
