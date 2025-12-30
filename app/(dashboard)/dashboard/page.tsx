"use client";

import { useDashboardStats } from "../../../lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Users, Briefcase, CalendarCheck, Building2, FolderOpen, UserCheck } from "lucide-react";
import { ErrorMessage } from "../../../components/pre-ui/error-message";
import { Button } from "../../../components/ui/button";
import { RefreshCw } from "lucide-react";
import { ClockInWidget } from "../../../components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "../../../components/ui/dashboard-skeleton";
import { Skeleton } from "../../../components/ui/skeleton";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { EmptyState } from "../../../components/ui/empty-state";

export default function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

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
      value: stats.orgSlug,
      icon: Building2,
    },
  ];

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
          <CardHeader>
            <CardTitle className="text-foreground">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="No recent projects"
              description="Create your first project to start tracking work."
              action={{
                label: "Create Project",
                onClick: () => window.location.href = "/projects"
              }}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Team Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={UserCheck}
              title="No team members online"
              description="Team availability will appear here when members clock in."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


