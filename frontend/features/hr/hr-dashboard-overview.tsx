"use client";

import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TruncatedText } from "@/components/ui/truncated-text";

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
          <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
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

      <ScrollArea hideScrollbar className="flex-1 max-h-52">
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
            <div className="w-8 rounded-full bg-muted flex items-center justify-center">
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
                <Avatar className="w-8 shrink-0">
                  {leave.userImage && (
                    <AvatarImage src={leave.userImage} alt={leave.userName} />
                  )}
                  <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 font-semibold">
                    {leave.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <TruncatedText text={leave.userName} className="text-xs font-semibold text-foreground" />
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
      </ScrollArea>
    </div>
  );
}

function OnboardingStatusWidget() {
  const { data, isLoading } = useHrOnboardingStatus();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
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
            <div className="w-8 rounded-full bg-muted flex items-center justify-center">
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
                    <div className="w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                      {hire.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <TruncatedText text={hire.name} className="text-xs font-medium text-foreground" />
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
    tone: "blue" as const,
    href: "/hr",
  },
  {
    key: "activeEmployees" as const,
    label: "Active Employees",
    icon: UserCheck,
    tone: "emerald" as const,
  },
  {
    key: "onLeaveToday" as const,
    label: "On Leave Today",
    icon: CalendarOff,
    tone: "amber" as const,
    href: "/hr/leaves",
  },
  {
    key: "pendingLeaveRequests" as const,
    label: "Pending Leaves",
    icon: ClipboardList,
    tone: "red" as const,
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
  tone: "blue" | "emerald" | "amber" | "red";
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
      <StatCardGrid cols={4}>
        {METRIC_CARDS.map(({ key, label, icon, tone, href }) => {
          const value = metrics?.[key] ?? 0;
          const hint =
            key === "activeEmployees" && !isLoading
              ? `${activeRate}% rate`
              : key === "pendingLeaveRequests" && !isLoading && value > 0
                ? "Needs attention"
                : undefined;

          return (
            <StatCard
              key={key}
              label={label}
              value={value}
              icon={icon}
              tone={tone}
              href={href}
              hint={hint}
              isLoading={isLoading}
            />
          );
        })}
      </StatCardGrid>

      <div className="grid sm:grid-cols-2 gap-3">
        <LeaveCalendarWidget />
        <OnboardingStatusWidget />
      </div>
    </div>
  );
}
