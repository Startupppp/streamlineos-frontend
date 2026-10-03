"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanState } from "@/hooks/api/access";
import { useHrAttendanceStatus } from "@/hooks/api/hr/attendance";
import { useHrMyLeaveRequests } from "@/hooks/api/hr/leaves";
import { useEssPayslips } from "@/hooks/api/payroll/ess";
import { latestLeaveDecision } from "./my-leave-decision";

function safeDate(value: string, pattern: string): string {
  const parsed = value ? parseISO(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, pattern);
}

function RecentItem({
  label,
  children,
  href,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:py-0">
      <span className="text-micro uppercase tracking-wide text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className="text-dense font-medium text-primary">
          {children}
        </Link>
      ) : (
        <span className="text-dense text-foreground">{children}</span>
      )}
    </div>
  );
}

const NOT_IN_ACCESS = "Not included in your access";

function LastPunch() {
  const access = useCanState("self:attendance");
  const { data, isLoading, isError } = useHrAttendanceStatus();
  if (access === "denied") return <RecentItem label="Last punch">{NOT_IN_ACCESS}</RecentItem>;
  if (access === "loading" || isLoading) return <Skeleton className="h-9 w-32" />;
  if (isError) return <RecentItem label="Last punch">Attendance unavailable</RecentItem>;

  const log = data?.todayLog ?? data?.logs?.[0] ?? null;
  const stamp = log?.checkOut ?? log?.checkIn ?? null;
  if (!stamp) return <RecentItem label="Last punch">No punches recorded yet</RecentItem>;
  const date = stamp instanceof Date ? stamp : new Date(stamp);
  if (Number.isNaN(date.getTime())) return <RecentItem label="Last punch">No punches recorded yet</RecentItem>;
  return (
    <RecentItem label="Last punch" href="/me/attendance">
      {format(date, "MMM d, h:mm a")}
    </RecentItem>
  );
}

function LastLeaveDecision() {
  const access = useCanState("self:leaves");
  const { data, isLoading, isError } = useHrMyLeaveRequests();
  if (access === "denied") return <RecentItem label="Last leave decision">{NOT_IN_ACCESS}</RecentItem>;
  if (access === "loading" || isLoading) return <Skeleton className="h-9 w-32" />;
  if (isError) return <RecentItem label="Last leave decision">Leave history unavailable</RecentItem>;

  const decision = latestLeaveDecision(data?.requests ?? []);
  if (!decision) return <RecentItem label="Last leave decision">No decision yet</RecentItem>;
  return (
    <RecentItem label="Last leave decision" href="/me/time-off">
      {decision.leaveTypeName} · {decision.status.toLowerCase()} · {safeDate(decision.startDate, "MMM d")}
    </RecentItem>
  );
}

function LastPayslip() {
  const access = useCanState("self:payslips");
  const { data, isLoading, isError } = useEssPayslips();
  if (access === "denied") return <RecentItem label="Last payslip">{NOT_IN_ACCESS}</RecentItem>;
  if (access === "loading" || isLoading) return <Skeleton className="h-9 w-32" />;
  if (isError) return <RecentItem label="Last payslip">Payslips unavailable</RecentItem>;

  const payslips = data ?? [];
  if (payslips.length === 0)
    return <RecentItem label="Last payslip">No payslips yet. HR hasn&apos;t published a run.</RecentItem>;
  const latest = payslips.reduce((newest, row) => (row.month > newest.month ? row : newest), payslips[0]);
  return (
    <RecentItem label="Last payslip" href="/me/pay">
      {safeDate(`${latest.month}-01`, "MMM yyyy")}
    </RecentItem>
  );
}

export function EssRecentStrip() {
  return (
    <section
      aria-label="Recent"
      className="grid grid-cols-1 divide-y divide-border rounded-2xl border border-border bg-card p-3 sm:grid-cols-3 sm:gap-4 sm:divide-y-0 sm:p-4"
    >
      <LastPunch />
      <LastLeaveDecision />
      <LastPayslip />
    </section>
  );
}
