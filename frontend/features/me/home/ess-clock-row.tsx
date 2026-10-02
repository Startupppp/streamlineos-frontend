"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrAttendanceStatus, useHrCheckIn, useHrCheckOut } from "@/hooks/api/hr/attendance";
import { useHrLeaveContext } from "@/hooks/api/hr/leaves";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const MAX_BALANCES = 3;

function punchTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "h:mm a");
}

function LeaveBalances() {
  const { data, isLoading, isError } = useHrLeaveContext();
  if (isLoading) return <Skeleton className="h-6 w-40" />;
  if (isError) return <span className="text-dense text-muted-foreground">Leave balance unavailable.</span>;

  const balances = (data?.balances ?? []).filter((row) => row.typeName);
  if (balances.length === 0)
    return <span className="text-dense text-muted-foreground">No leave balance configured yet.</span>;

  const neutral = statusToneClasses("neutral");
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {balances.slice(0, MAX_BALANCES).map((row) => (
        <span
          key={row.id}
          className={cn(
            "inline-flex h-6 items-center rounded-full border px-2 text-micro font-medium tabular-nums",
            neutral.surface,
            neutral.ink,
            neutral.rule,
          )}
        >
          {row.balance} {row.typeName}
        </span>
      ))}
    </span>
  );
}

export function EssClockRow() {
  const [punchFailed, setPunchFailed] = useState(false);
  const { data, isLoading, isError } = useHrAttendanceStatus();

  const handlePunchError = useCallback((error: Error) => {
    setPunchFailed(true);
    toast.error(error.message);
  }, []);
  const handlePunchDone = useCallback(() => {
    setPunchFailed(false);
  }, []);

  const checkIn = useHrCheckIn({ onError: handlePunchError, onSuccess: handlePunchDone });
  const checkOut = useHrCheckOut({ onError: handlePunchError, onSuccess: handlePunchDone });

  const handleClockIn = useCallback(() => {
    checkIn.mutate({ location: undefined });
  }, [checkIn]);
  const handleClockOut = useCallback(() => {
    checkOut.mutate();
  }, [checkOut]);

  const clockedIn = data?.status === "PRESENT" || data?.status === "ON_BREAK";
  const since = punchTime(data?.todayLog?.checkIn);
  const pending = checkIn.isPending || checkOut.isPending;

  return (
    <section
      aria-label="Today"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-dense text-muted-foreground">
          Attendance:{" "}
          {isLoading ? (
            <span className="text-foreground">Checking…</span>
          ) : isError || !data ? (
            <span className="text-foreground">Not available</span>
          ) : clockedIn ? (
            <span className="text-foreground">{since ? `Clocked in since ${since}` : "Clocked in"}</span>
          ) : (
            <span className="text-foreground">Not clocked in</span>
          )}
        </p>
        <LeaveBalances />
        {punchFailed ? (
          <Link href="/me/attendance" className="text-dense font-medium text-primary">
            Punch did not go through — request a regularisation
          </Link>
        ) : null}
      </div>

      {isError || !data ? null : clockedIn ? (
        <Button className="min-h-11 shrink-0 sm:min-h-10" variant="outline" onClick={handleClockOut} disabled={pending}>
          Clock out
        </Button>
      ) : (
        <Button className="min-h-11 shrink-0 sm:min-h-10" onClick={handleClockIn} disabled={pending || isLoading}>
          Clock in
        </Button>
      )}
    </section>
  );
}
