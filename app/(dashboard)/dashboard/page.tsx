"use client";

import { useSession } from "next-auth/react";
import { useDashboardStats, useRecentProjects, useTeamAvailability, useEmployeeTickets, useActiveSprintSummary, useRecentActivity } from "../../../lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Users, Briefcase, CalendarCheck, Building2, Folder, Clock, LogOut, ListTodo, Activity, Zap, ArrowUpRight, Bug, BookOpen, CheckCircle2, Plus, UserPlus } from "lucide-react";
import { ErrorMessage } from "../../../components/pre-ui/error-message";
import { Button } from "../../../components/ui/button";
import { RefreshCw } from "lucide-react";
import { ClockInWidget } from "../../../components/attendance/clock-in-widget";
import {
  EmptyTasksIllustration,
  EmptyProjectsIllustration,
  EmptyActivityIllustration,
  EmptySprintIllustration,
  EmptyTeamIllustration,
} from "../../../components/illustrations";
import { DashboardStatsSkeleton } from "../../../components/ui/dashboard-skeleton";
import { Skeleton } from "../../../components/ui/skeleton";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { resolveImageUrl } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

const formatTime = (time: string | Date | null | undefined): string => {
  if (!time) return "";
  try {
    const date = typeof time === "string" ? new Date(`1970-01-01T${time}`) : time;
    return format(date, "hh:mm a");
  } catch {
    return String(time);
  }
};

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
  EPIC: Zap,
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
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3 bg-card border-border">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
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
            onClick: () => window.location.href = "/org-selection"
          }}
        />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      href: "/hr",
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: Briefcase,
      href: "/projects",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: CalendarCheck,
      href: "/hr/attendance",
    },
    {
      label: "Organization",
      value: stats.orgName,
      icon: Building2,
    },
  ];

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-700",
    PLANNING: "bg-blue-500/10 text-blue-700",
    COMPLETED: "bg-slate-500/10 text-slate-700",
    ON_HOLD: "bg-amber-500/10 text-amber-700",
  };

  const getInitials = (name: string | null | undefined, firstName?: string | null, lastName?: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const myTickets = myTicketsData?.data || [];
  const inProgressTickets = myTickets.filter(t => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
  const todoTickets = myTickets.filter(t => t.status === "TODO" || t.status === "BACKLOG");
  const sortedMyTickets = [...inProgressTickets, ...todoTickets];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <PageHeader
            title={`${getGreeting()}, ${firstName}`}
            description={`Overview for ${stats.orgName}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Link href="/projects">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Project
              </Button>
            </Link>
            <Link href="/hr">
              <Button variant="outline" size="sm">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add Employee
              </Button>
            </Link>
          </div>
          <ClockInWidget />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Sprint Progress + My Issues row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* My Issues */}
        <Card className="lg:col-span-4 bg-card border-border flex flex-col" style={{ maxHeight: "420px" }}>
          <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
            <CardTitle className="text-foreground flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              My Issues
            </CardTitle>
            <Badge variant="secondary">{sortedMyTickets.length} open</Badge>
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
                  const projectKey = (ticket as Record<string, unknown>).project
                    ? ((ticket as Record<string, unknown>).project as { key?: string }).key
                    : "";
                  const projectName = (ticket as Record<string, unknown>).project
                    ? ((ticket as Record<string, unknown>).project as { name?: string }).name
                    : "";
                  const projectId = (ticket as Record<string, unknown>).project
                    ? ((ticket as Record<string, unknown>).project as { id?: number }).id
                    : undefined;
                  return (
                    <Link key={ticket.id} href={projectId ? `/projects/${projectId}` : "#"}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {projectKey}-{ticket.ticketNumber}
                            </span>
                            <span className="font-medium text-sm text-foreground truncate">{ticket.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{projectName}</p>
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

        {/* Active Sprint Progress */}
        <Card className="lg:col-span-3 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Active Sprint
            </CardTitle>
            {sprintSummary?.projectId && (
              <Link href={`/projects/${sprintSummary.projectId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {sprintLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : sprintSummary ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">{sprintSummary.name}</h3>
                  <p className="text-sm text-muted-foreground">{sprintSummary.projectName}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{sprintSummary.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${sprintSummary.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Days Left</p>
                    <p className={`text-lg font-bold ${sprintSummary.daysRemaining <= 2 ? "text-red-500" : "text-foreground"}`}>
                      {sprintSummary.daysRemaining}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-lg font-bold text-foreground">
                      {sprintSummary.completedPoints}/{sprintSummary.totalPoints}
                    </p>
                  </div>
                </div>

                {/* Ticket breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Done
                    </span>
                    <span className="font-medium">{sprintSummary.doneTickets}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      In Progress
                    </span>
                    <span className="font-medium">{sprintSummary.inProgressTickets}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      To Do
                    </span>
                    <span className="font-medium">{sprintSummary.todoTickets}</span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                illustration={<EmptySprintIllustration />}
                title="No active sprint"
                description="Start a sprint in your project to see progress here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects + Activity + Team Availability row */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Projects */}
        <Card className="lg:col-span-4 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Recent Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm">View All</Button>
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
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-primary" />
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
                  onClick: () => window.location.href = "/projects"
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-4 bg-card border-border flex flex-col" style={{ maxHeight: "420px" }}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
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
                          <Avatar className="h-6 w-6 flex-shrink-0">
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

        {/* Team Availability */}
        <Card className="lg:col-span-4 bg-card border-border flex flex-col" style={{ maxHeight: "420px" }}>
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-foreground">Team Availability</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {teamLoading ? (
              <div className="space-y-3 overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : teamAvailability && teamAvailability.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '100%' }}>
                {teamAvailability.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={resolveImageUrl(member.image)} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${member.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {member.isOnline ? (
                            <>
                              <Clock className="h-3 w-3" />
                              Checked in at {formatTime(member.checkIn)}
                            </>
                          ) : member.checkOut ? (
                            <>
                              <LogOut className="h-3 w-3" />
                              Checked out at {formatTime(member.checkOut)}
                            </>
                          ) : (
                            "Offline"
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant={member.isOnline ? "default" : "secondary"} className={member.isOnline ? "bg-emerald-500" : ""}>
                      {member.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  illustration={<EmptyTeamIllustration />}
                  title="No team members online"
                  description="Team availability will appear here when members clock in."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
