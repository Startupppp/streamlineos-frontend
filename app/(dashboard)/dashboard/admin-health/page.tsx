"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Users, AlertTriangle, Clock, Wallet, CalendarDays, CheckSquare } from "lucide-react";
import Link from "next/link";

interface AdminHealthData {
  unassignedLeads: number;
  overdueTasks: number;
  pendingExpenses: { count: number; totalAmount: string };
  pendingLeaves: number;
  onboarding: { totalTasks: number; completedTasks: number; completionPercent: number };
  totalEmployees: number;
}

export default function AdminHealthDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.dashboard.all, "admin-health"],
    queryFn: () => apiClient.get<AdminHealthData>("/dashboard/admin-health"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="System Health" subtitle="Real-time overview of critical metrics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const kpis = [
    {
      label: "Unassigned Leads",
      value: data?.unassignedLeads ?? 0,
      icon: AlertTriangle,
      color: (data?.unassignedLeads ?? 0) > 0 ? "text-red-500" : "text-green-500",
      bgColor: (data?.unassignedLeads ?? 0) > 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950",
      description: "Leads without an assigned owner",
      link: "/crm/leads?assignedToId=",
    },
    {
      label: "Overdue Tasks",
      value: data?.overdueTasks ?? 0,
      icon: Clock,
      color: (data?.overdueTasks ?? 0) > 0 ? "text-amber-500" : "text-green-500",
      bgColor: (data?.overdueTasks ?? 0) > 0 ? "bg-amber-50 dark:bg-amber-950" : "bg-green-50 dark:bg-green-950",
      description: "Tasks past their due date",
      link: "/tasks?filter=overdue",
    },
    {
      label: "Pending Expenses",
      value: data?.pendingExpenses.count ?? 0,
      icon: Wallet,
      color: (data?.pendingExpenses.count ?? 0) > 0 ? "text-blue-500" : "text-green-500",
      bgColor: (data?.pendingExpenses.count ?? 0) > 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-green-50 dark:bg-green-950",
      description: `INR ${Number(data?.pendingExpenses.totalAmount ?? 0).toLocaleString("en-IN")} awaiting approval`,
      link: "/hr/expenses?status=PENDING",
    },
    {
      label: "Pending Leave Requests",
      value: data?.pendingLeaves ?? 0,
      icon: CalendarDays,
      color: (data?.pendingLeaves ?? 0) > 0 ? "text-orange-500" : "text-green-500",
      bgColor: (data?.pendingLeaves ?? 0) > 0 ? "bg-orange-50 dark:bg-orange-950" : "bg-green-50 dark:bg-green-950",
      description: "Leave requests awaiting approval",
      link: "/hr/leaves?status=PENDING",
    },
    {
      label: "Total Employees",
      value: data?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Active employees in the organization",
      link: "/hr/employees",
    },
    {
      label: "Onboarding Progress",
      value: `${data?.onboarding.completionPercent ?? 100}%`,
      icon: CheckSquare,
      color: (data?.onboarding.completionPercent ?? 100) < 80 ? "text-amber-500" : "text-green-500",
      bgColor: (data?.onboarding.completionPercent ?? 100) < 80 ? "bg-amber-50 dark:bg-amber-950" : "bg-green-50 dark:bg-green-950",
      description: `${data?.onboarding.completedTasks ?? 0} of ${data?.onboarding.totalTasks ?? 0} tasks complete`,
      link: "/hr/onboarding",
    },
  ];

  return (
    <PageWrapper title="System Health" subtitle="Real-time overview of critical metrics for leadership">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.link}>
              <Card className={`${kpi.bgColor} border-0 transition-shadow hover:shadow-md cursor-pointer`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                  {kpi.label === "Onboarding Progress" && (
                    <Progress value={data?.onboarding.completionPercent ?? 100} className="mt-3 h-2" />
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
