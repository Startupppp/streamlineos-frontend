"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import {
  useHrDashboardMetrics,
  useHrLeaveCalendar,
  useHrOnboardingStatus,
} from "@/lib/api/hooks/hr/dashboard";
import { Users, UserCheck, CalendarOff, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

const HR_ADMIN_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR", "BRANCH_MANAGER"];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LeaveCalendarWidget() {
  const now = new Date();
  const { data, isLoading } = useHrLeaveCalendar(now.getMonth() + 1, now.getFullYear());

  const today = now.toISOString().slice(0, 10);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const thisWeekLeaves = (data ?? []).filter(
    (l) => l.status === "APPROVED" && l.startDate <= next7 && l.endDate >= today,
  );

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">On Leave This Week</CardTitle>
        <Link
          href="/hr/leaves"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : thisWeekLeaves.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No approved leaves this week
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {thisWeekLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-2 py-1">
                <Avatar className="h-7 w-7 shrink-0">
                  {leave.userImage && <AvatarImage src={leave.userImage} alt={leave.userName} />}
                  <AvatarFallback className="text-[10px]">
                    {leave.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{leave.userName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateLabel(leave.startDate)} – {formatDateLabel(leave.endDate)}
                    {" · "}
                    {leave.leaveType}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {leave.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function OnboardingStatusWidget() {
  const { data, isLoading } = useHrOnboardingStatus();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Onboarding Status</CardTitle>
        </div>
        <Link
          href="/hr/onboarding"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        ) : !data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No onboarding in progress
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" />
                {data.inProgress} in progress
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                {data.completed} completed
              </span>
              <span className="ml-auto font-medium text-foreground">
                {data.completionPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${data.completionPct}%` }}
              />
            </div>
            {data.newHires.length > 0 && (
              <div className="space-y-2 mt-1">
                {data.newHires.map((hire) => (
                  <div key={hire.userId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{hire.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${hire.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                        {hire.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HrDashboardOverview() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data: metrics, isLoading } = useHrDashboardMetrics();

  if (!role || !HR_ADMIN_ROLES.includes(role)) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Employees"
          value={isLoading ? "—" : (metrics?.totalEmployees ?? 0)}
          icon={Users}
          color="blue"
          index={0}
          href="/hr"
        />
        <StatCard
          label="Active"
          value={isLoading ? "—" : (metrics?.activeEmployees ?? 0)}
          icon={UserCheck}
          color="green"
          index={1}
        />
        <StatCard
          label="On Leave Today"
          value={isLoading ? "—" : (metrics?.onLeaveToday ?? 0)}
          icon={CalendarOff}
          color="amber"
          index={2}
          href="/hr/leaves"
        />
        <StatCard
          label="Pending Leaves"
          value={isLoading ? "—" : (metrics?.pendingLeaveRequests ?? 0)}
          icon={ClipboardList}
          color="red"
          index={3}
          href="/hr/leaves"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <LeaveCalendarWidget />
        <OnboardingStatusWidget />
      </div>
    </div>
  );
}
