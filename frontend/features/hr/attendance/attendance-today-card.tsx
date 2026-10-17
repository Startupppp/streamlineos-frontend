"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { useHrMonthlyAttendance } from "@/hooks/api/hr";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import { formatIstDate, presentCutoff } from "@/lib/hrms/payroll-cutoff";
import { attendancePayrollHint } from "./attendance-payroll-hint";
import { buildWeekStrip, type PresenceState } from "./attendance-week";

const PRESENCE_TONE: Readonly<Record<PresenceState, StatusTone>> = {
  in: "success",
  out: "neutral",
  wfh: "info",
  leave: "warning",
  unknown: "neutral",
};

const PRESENCE_LABEL: Readonly<Record<PresenceState, string>> = {
  in: "In",
  out: "Out",
  wfh: "WFH",
  leave: "Leave",
  unknown: "No record",
};

interface AttendanceTodayCardProps {
  statusLabel: string;
  lastPunchLabel: string | null;
}

export function AttendanceTodayCard({
  statusLabel,
  lastPunchLabel,
}: AttendanceTodayCardProps) {
  const now = useMemo(() => new Date(), []);
  const { cutoff } = usePayrollCutoff();
  const payrollHint = useMemo(() => {
    if (lastPunchLabel !== null) return null;
    const presented = cutoff ? presentCutoff(cutoff, now) : null;
    return presented
      ? attendancePayrollHint(presented.daysRemaining, presented.label)
      : null;
  }, [cutoff, lastPunchLabel, now]);
  const { data: monthRows, isLoading } = useHrMonthlyAttendance({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const week = useMemo(
    () => buildWeekStrip(monthRows ?? [], now),
    [monthRows, now],
  );
  const hintTone = statusToneClasses("warning");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Today · {formatIstDate(now)}
        </p>
        <p className="text-dense text-muted-foreground">{statusLabel}</p>
      </div>

      <p className="text-dense text-muted-foreground">
        Last punch: {lastPunchLabel ?? "—"}
      </p>

      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : (
        <ul className="flex items-end gap-1.5" aria-label="This week's presence">
          {week.map((day) => {
            const tone = statusToneClasses(PRESENCE_TONE[day.presence]);
            return (
              <li
                key={day.dayKey}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${day.dayKey} · ${PRESENCE_LABEL[day.presence]}`}
              >
                <span
                  className={`size-2 rounded-full ${day.presence === "unknown" ? "bg-muted" : tone.fill}`}
                  aria-hidden
                />
                <span
                  className={`text-micro font-semibold ${day.isToday ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {day.initial}
                </span>
                <span className="sr-only">
                  {day.dayKey}: {PRESENCE_LABEL[day.presence]}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {payrollHint ? (
        <p
          className={`rounded-lg border p-2.5 text-dense ${hintTone.surface} ${hintTone.rule} ${hintTone.ink}`}
          role="note"
        >
          {payrollHint}
        </p>
      ) : null}
    </div>
  );
}
