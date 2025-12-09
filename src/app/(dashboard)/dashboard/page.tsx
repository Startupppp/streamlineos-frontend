"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, CalendarCheck, CreditCard } from "lucide-react";
import { LoadingSpinner } from "@/components/pre-ui/loading-spinner";
import { ErrorMessage } from "@/components/pre-ui/error-message";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";

export default function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = api.dashboard.getStats.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoadingSpinner />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-8">
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
      <div className="p-8 space-y-8">
        <div className="text-muted-foreground">Please select an organization.</div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-pink-500",
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: Briefcase,
      color: "text-violet-500",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: CalendarCheck,
      color: "text-emerald-500",
    },
    {
       label: "Organization ID",
       value: stats.orgSlug,
       icon: CreditCard,
       color: "text-zinc-500"
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-zinc-400">Overview for {stats.orgName}</p>
        </div>
        <ClockInWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent Activity / Charts could go here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-zinc-400 text-sm">No recent activity.</p>
            </CardContent>
        </Card>
        <Card className="col-span-3 bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Team Availability</CardTitle>
            </CardHeader>
             <CardContent>
                <p className="text-zinc-400 text-sm">Everyone is offline.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
