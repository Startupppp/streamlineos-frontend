"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  Users,
  AlertTriangle,
  Clock,
  Wallet,
  CalendarDays,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AdminHealthData {
  unassignedLeads: number;
  overdueTasks: number;
  pendingExpenses: { count: number; totalAmount: string };
  pendingLeaves: number;
  onboarding: {
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
  };
  totalEmployees: number;
}

type Severity = "ok" | "warn" | "alert" | "info";

const SEVERITY_STYLES: Record<
  Severity,
  { bar: string; iconBg: string; iconColor: string }
> = {
  ok: {
    bar: "bg-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  warn: {
    bar: "bg-amber-500",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
  alert: {
    bar: "bg-red-500",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600",
  },
  info: {
    bar: "bg-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
};

function HealthCard({
  label,
  value,
  description,
  icon: Icon,
  severity,
  href,
  children,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  severity: Severity;
  href: string;
  children?: React.ReactNode;
}) {
  const s = SEVERITY_STYLES[severity];
  return (
    <Link href={href} className="block group">
      <div className="relative h-full rounded-xl border border-border/70 bg-card shadow-noir p-4 overflow-hidden transition-all duration-200 hover:border-blue-400 hover:shadow-[0_8px_24px_-8px_rgba(59,130,246,0.22)] hover:-translate-y-0.5">
        <div className={cn("absolute top-0 left-0 right-0 h-[2px]", s.bar)} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p
              className={cn(
                "font-bold mt-1 leading-none truncate text-foreground",
                String(value).length > 4 ? "text-2xl" : "text-3xl",
              )}
            >
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-snug">
              {description}
            </p>
          </div>
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
              s.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", s.iconColor)} />
          </div>
        </div>
        {children}
      </div>
    </Link>
  );
}

export default function AdminHealthDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.dashboard.all, "admin-health"],
    queryFn: () => apiClient.get<AdminHealthData>("/dashboard/admin-health"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <PageWrapper
        title="System Health"
        subtitle="Real-time overview of critical metrics for leadership"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-border bg-card p-4 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/30" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  const unassignedLeads = data?.unassignedLeads ?? 0;
  const overdueTasks = data?.overdueTasks ?? 0;
  const pendingExpenseCount = data?.pendingExpenses.count ?? 0;
  const pendingLeaves = data?.pendingLeaves ?? 0;
  const onboardingPct = data?.onboarding.completionPercent ?? 100;
  const totalEmployees = data?.totalEmployees ?? 0;
  const expenseAmount = Number(data?.pendingExpenses.totalAmount ?? 0);

  const kpis = [
    {
      label: "Unassigned Leads",
      value: unassignedLeads,
      icon: AlertTriangle,
      severity: (unassignedLeads > 0 ? "alert" : "ok") as Severity,
      description: "Leads without an assigned owner",
      href: "/crm/leads?assignedToId=",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks,
      icon: Clock,
      severity: (overdueTasks > 0 ? "warn" : "ok") as Severity,
      description: "Tasks past their due date",
      href: "/tasks?filter=overdue",
    },
    {
      label: "Pending Expenses",
      value: pendingExpenseCount,
      icon: Wallet,
      severity: (pendingExpenseCount > 0 ? "info" : "ok") as Severity,
      description: `INR ${expenseAmount.toLocaleString("en-IN")} awaiting approval`,
      href: "/hr/expenses?status=PENDING",
    },
    {
      label: "Pending Leave Requests",
      value: pendingLeaves,
      icon: CalendarDays,
      severity: (pendingLeaves > 0 ? "warn" : "ok") as Severity,
      description: "Leave requests awaiting approval",
      href: "/hr/leaves?status=PENDING",
    },
    {
      label: "Total Employees",
      value: totalEmployees,
      icon: Users,
      severity: "info" as Severity,
      description: "Active employees in the organization",
      href: "/hr/employees",
    },
    {
      label: "Onboarding Progress",
      value: `${onboardingPct}%`,
      icon: CheckSquare,
      severity: (onboardingPct < 80 ? "warn" : "ok") as Severity,
      description: `${data?.onboarding.completedTasks ?? 0} of ${data?.onboarding.totalTasks ?? 0} tasks complete`,
      href: "/hr/onboarding",
      progressBar: true,
    },
  ];

  return (
    <PageWrapper
      title="System Health"
      subtitle="Real-time overview of critical metrics for leadership"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <HealthCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            severity={kpi.severity}
            href={kpi.href}
          >
            {kpi.progressBar && (
              <Progress
                value={onboardingPct}
                className="mt-3 h-1.5 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-500"
              />
            )}
          </HealthCard>
        ))}
      </div>
    </PageWrapper>
  );
}
