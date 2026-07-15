"use client";

import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useHrDashboardMetrics,
  useHrLeaveCalendar,
  useHrOnboardingStatus,
} from "@/hooks/api/hr/dashboard";
import {
  Users,
  UserCheck,
  CalendarOff,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const HR_ADMIN_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR", "BRANCH_MANAGER"];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LeaveCalendarWidget() {
  const now = new Date();
  const { data, isLoading } = useHrLeaveCalendar(
    now.getMonth() + 1,
    now.getFullYear(),
  );
  const today = now.toISOString().slice(0, 10);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const thisWeekLeaves = (data ?? []).filter(
    (l) =>
      l.status === "APPROVED" && l.startDate <= next7 && l.endDate >= today,
  );

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <CalendarOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              On Leave This Week
            </h3>
            {!isLoading && (
              <p className="text-[10px] text-muted-foreground">
                {thisWeekLeaves.length} employee
                {thisWeekLeaves.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/hr/leaves"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-52">
        {isLoading ? (
          <div className="px-5 py-2 divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : thisWeekLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Everyone is in this week
            </p>
          </div>
        ) : (
          <div className="px-5 divide-y divide-border/40">
            {thisWeekLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {leave.userImage && (
                    <AvatarImage src={leave.userImage} alt={leave.userName} />
                  )}
                  <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 font-semibold">
                    {leave.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {leave.userName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDateLabel(leave.startDate)} –{" "}
                    {formatDateLabel(leave.endDate)}
                    <span className="mx-1">·</span>
                    <span className="capitalize">
                      {leave.leaveType?.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-semibold shrink-0 uppercase tracking-wide">
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingStatusWidget() {
  const { data, isLoading } = useHrOnboardingStatus();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              Onboarding Progress
            </h3>
            {!isLoading && data && (
              <p className="text-[10px] text-muted-foreground">
                {data.total} total · {data.completed} complete
              </p>
            )}
          </div>
        </div>
        <Link
          href="/hr/onboarding"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="px-5 py-4 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        ) : !data || data.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              No onboarding in progress
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <Clock className="h-3 w-3" /> {data.inProgress} in progress
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> {data.completed} done
                  </span>
                </div>
                <span className="font-bold text-foreground tabular-nums">
                  {data.completionPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                  style={{ width: `${data.completionPct}%` }}
                />
              </div>
            </div>

            {data.newHires.length > 0 && (
              <div className="space-y-3">
                {data.newHires.map((hire) => (
                  <div
                    key={hire.userId}
                    className="flex items-center gap-3 group"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                      {hire.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {hire.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${hire.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">
                          {hire.pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const METRIC_CARDS = [
  {
    key: "totalEmployees" as const,
    label: "Total Headcount",
    icon: Users,
    accent: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    valueColor: "text-blue-700 dark:text-blue-400",
    href: "/hr",
  },
  {
    key: "activeEmployees" as const,
    label: "Active Employees",
    icon: UserCheck,
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    key: "onLeaveToday" as const,
    label: "On Leave Today",
    icon: CalendarOff,
    accent: "border-l-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueColor: "text-amber-700 dark:text-amber-400",
    href: "/hr/leaves",
  },
  {
    key: "pendingLeaveRequests" as const,
    label: "Pending Leaves",
    icon: ClipboardList,
    accent: "border-l-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    valueColor: "text-rose-700 dark:text-rose-400",
    href: "/hr/leaves",
  },
] satisfies Array<{
  key:
    | "totalEmployees"
    | "activeEmployees"
    | "onLeaveToday"
    | "pendingLeaveRequests";
  label: string;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  href?: string;
}>;

export function HrDashboardOverview() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data: metrics, isLoading } = useHrDashboardMetrics();

  if (!role || !HR_ADMIN_ROLES.includes(role)) return null;

  const activeRate = metrics?.totalEmployees
    ? Math.round((metrics.activeEmployees / metrics.totalEmployees) * 100)
    : 0;

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRIC_CARDS.map(
          ({
            key,
            label,
            icon: Icon,
            accent,
            iconBg,
            iconColor,
            valueColor,
            href,
          }) => {
            const value = isLoading ? null : (metrics?.[key] ?? 0);
            const card = (
              <div
                className={`relative rounded-2xl border border-border border-l-4 ${accent} bg-card p-4 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${href ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 truncate">
                      {label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p
                        className={`text-3xl font-bold tabular-nums ${valueColor}`}
                      >
                        {value}
                      </p>
                    )}
                    {key === "activeEmployees" && !isLoading && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {activeRate}% rate
                        </span>
                      </div>
                    )}
                    {key === "pendingLeaveRequests" &&
                      !isLoading &&
                      value !== null &&
                      value > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <AlertCircle className="h-3 w-3 text-rose-500" />
                          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                            Needs attention
                          </span>
                        </div>
                      )}
                  </div>
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                </div>
              </div>
            );
            return href ? (
              <Link key={key} href={href}>
                {card}
              </Link>
            ) : (
              <div key={key}>{card}</div>
            );
          },
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <LeaveCalendarWidget />
        <OnboardingStatusWidget />
      </div>
    </div>
  );
}
