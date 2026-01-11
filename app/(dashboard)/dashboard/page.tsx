"use client";

import { useDashboardStats, useRecentProjects, useTeamAvailability } from "../../../lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Users, Briefcase, CalendarCheck, Building2, FolderOpen, UserCheck, Folder, Clock, LogOut } from "lucide-react";
import { ErrorMessage } from "../../../components/pre-ui/error-message";
import { Button } from "../../../components/ui/button";
import { RefreshCw } from "lucide-react";
import { ClockInWidget } from "../../../components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "../../../components/ui/dashboard-skeleton";
import { Skeleton } from "../../../components/ui/skeleton";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

const formatTime = (time: string | Date | null | undefined): string => {
  if (!time) return "";
  try {
    const date = typeof time === "string" ? new Date(`1970-01-01T${time}`) : time;
    return format(date, "hh:mm a");
  } catch {
    return String(time);
  }
};

export default function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();

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
    ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    COMPLETED: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
    ON_HOLD: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="Dashboard"
          description={`Overview for ${stats.orgName}`}
        />
        <ClockInWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            href={stat.href}
          />
        ))}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-7">
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
                icon={FolderOpen}
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
        <Card className="lg:col-span-3 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Team Availability</CardTitle>
            <Link href="/hr/attendance">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {teamLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : teamAvailability && teamAvailability.length > 0 ? (
              <div className="space-y-3">
                {teamAvailability.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.image || undefined} />
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
              <EmptyState
                icon={UserCheck}
                title="No team members online"
                description="Team availability will appear here when members clock in."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
