"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WidgetCard } from "@/components/ui/widget-card";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarOff,
  CalendarHeart,
  TreePalm,
  Clock,
  Cake,
  Award,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useLeavesToday,
  useUpcomingHolidays,
  useMyLeaveBalance,
  useBirthdays,
  usePendingApprovals,
  useTeamAttendance,
  type LeaveToday,
  type UpcomingHoliday,
  type LeaveBalance,
  type BirthdayEntry,
} from "@/hooks/api/dashboard";

function EmptyWidget({ message }: { message: string }) {
  return (
    <p className="text-xs text-muted-foreground text-center py-6">{message}</p>
  );
}

export function LeavesTodayWidget() {
  const { data, isLoading } = useLeavesToday();
  const leaves = data ?? [];

  return (
    <WidgetCard
      icon={CalendarOff}
      iconClassName="text-orange-500"
      title="Who's On Leave Today"
      badge={leaves.length || undefined}
      isLoading={isLoading}
      isEmpty={!leaves.length}
      empty={<EmptyWidget message="Everyone is in today!" />}
    >
      <ul className="space-y-2.5 overflow-y-auto max-h-60">
        {leaves.map((l: LeaveToday) => (
          <li key={l.id} className="flex items-center gap-2.5">
            <Avatar className="w-7">
              <AvatarImage src={resolveImageUrl(l.employeeImage)} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {l.employeeName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <TruncatedText text={l.employeeName ?? ""} className="text-xs font-medium" />
              <p className="text-[10px] text-muted-foreground">
                Leave · back {format(new Date(l.endDate), "MMM d")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

export function UpcomingHolidaysWidget() {
  const { data, isLoading } = useUpcomingHolidays();
  const holidays = data ?? [];

  return (
    <WidgetCard
      icon={TreePalm}
      iconClassName="text-emerald-500"
      title="Upcoming Holidays"
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!holidays.length}
      empty={<EmptyWidget message="No upcoming holidays." />}
    >
      <ul className="space-y-2.5">
        {holidays.map((h: UpcomingHoliday) => (
          <li key={h.id} className="flex items-center gap-2.5">
            <div className="w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CalendarHeart className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <TruncatedText text={h.name} className="text-xs font-medium" />
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(h.date), "EEEE, MMM d")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

export function LeaveBalanceWidget() {
  const { data, isLoading } = useMyLeaveBalance();
  const balances = data ?? [];

  return (
    <WidgetCard
      icon={Clock}
      iconClassName="text-primary"
      title="My Leave Balance"
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!balances.length}
      empty={<EmptyWidget message="No leave balances found." />}
    >
      <div className="grid grid-cols-2 gap-2">
        {balances.map((b: LeaveBalance) => {
          const pct = b.daysPerYear
            ? (parseFloat(b.balance) / b.daysPerYear) * 100
            : 0;
          return (
            <div
              key={b.id}
              className="rounded-lg border border-border/60 p-2.5"
            >
              <TruncatedText text={b.leaveTypeName ?? ""} className="text-[10px] text-muted-foreground" />
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold tabular-nums">
                  {parseFloat(b.balance)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {b.daysPerYear}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function BirthdaysWidget() {
  const { data, isLoading } = useBirthdays();
  const entries = data ?? [];

  return (
    <WidgetCard
      icon={Cake}
      iconClassName="text-pink-500"
      title="Birthdays & Anniversaries"
      isLoading={isLoading}
      isEmpty={!entries.length}
      empty={<EmptyWidget message="No celebrations this week." />}
    >
      <ul className="space-y-2.5 overflow-y-auto max-h-60">
        {entries.map((b: BirthdayEntry) => (
          <li key={b.id} className="flex items-center gap-2.5">
            <Avatar className="w-7">
              <AvatarImage src={resolveImageUrl(b.image)} />
              <AvatarFallback className="text-[10px] bg-pink-500/10 text-pink-600">
                {b.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <TruncatedText text={b.name ?? ""} className="text-xs font-medium" />
              <div className="flex items-center gap-1.5">
                {b.type === "birthday" && (
                  <span className="text-[10px] text-pink-600 flex items-center gap-0.5">
                    <Cake className="h-3 w-3" /> Birthday{" "}
                    {b.date ? format(new Date(b.date), "MMM d") : ""}
                  </span>
                )}
                {b.type === "anniversary" && (
                  <span className="text-[10px] text-primary flex items-center gap-0.5">
                    <Award className="h-3 w-3" /> {b.yearsCompleted}yr
                    anniversary
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

export function PendingApprovalsWidget() {
  const { data, isLoading } = usePendingApprovals();

  return (
    <WidgetCard
      icon={AlertCircle}
      iconClassName="text-red-500"
      title="Pending Approvals"
      badge={data?.total || undefined}
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!data}
      empty={<EmptyWidget message="No data." />}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60">
          <span className="text-xs text-muted-foreground">Leave Requests</span>
          <span className="text-sm font-bold tabular-nums">
            {data?.pendingLeaves}
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60">
          <span className="text-xs text-muted-foreground">Resignations</span>
          <span className="text-sm font-bold tabular-nums">
            {data?.pendingResignations}
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}

export function TeamAttendanceWidget() {
  const { data, isLoading } = useTeamAttendance();

  return (
    <WidgetCard
      icon={Users}
      iconClassName="text-primary"
      title="Team Attendance"
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!data}
      empty={<EmptyWidget message="No data." />}
    >
      <div>
        <StatCardGrid cols={3} className="mb-3">
          <StatCard label="Present" value={data?.present ?? 0} icon={UserCheck} tone="emerald" />
          <StatCard label="Absent" value={data?.absent ?? 0} icon={UserX} tone="red" />
          <StatCard label="Total" value={data?.total ?? 0} icon={Users} tone="default" />
        </StatCardGrid>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${data?.total ? (data.present / data.total) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          {data?.total ? Math.round((data.present / data.total) * 100) : 0}%
          attendance rate
        </p>
      </div>
    </WidgetCard>
  );
}
