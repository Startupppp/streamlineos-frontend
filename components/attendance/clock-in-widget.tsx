"use client";

import { Button } from "../ui/button";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
} from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { LoadingSpinner } from "../pre-ui/loading-spinner";
import { Clock } from "lucide-react";

export function ClockInWidget() {
  const [now, setNow] = useState(new Date());

  const { data: statusData, isLoading } = useHrAttendanceStatus();

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckedIn = statusData?.status === "PRESENT";
  const isOnBreak = statusData?.status === "ON_BREAK";

  const handleClockAction = () => {
    if (isCheckedIn || isOnBreak) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate({ location: undefined });
    }
  };

  const isPending =
    checkInMutation.isPending || checkOutMutation.isPending || isLoading;

  const sessionTime = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) return null;
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  }, [now, statusData?.todayLog]);

  const dailyStats = statusData?.dailyStats;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-muted-foreground font-bold text-sm tracking-wide">
        {format(now, "hh:mm a - EEE dd, MMM yyyy").toUpperCase()}
      </div>
      
      {(isCheckedIn || isOnBreak) && sessionTime && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-mono font-bold text-primary">
            {String(sessionTime.hours).padStart(2, "0")}:
            {String(sessionTime.minutes).padStart(2, "0")}:
            {String(sessionTime.seconds).padStart(2, "0")}
          </span>
        </div>
      )}
      
      {dailyStats && parseFloat(dailyStats.workHours) > 0 && (
        <div className="text-xs text-muted-foreground">
          Today: {parseFloat(dailyStats.workHours).toFixed(1)}h worked
          {parseFloat(dailyStats.breakHours) > 0 && `, ${parseFloat(dailyStats.breakHours).toFixed(1)}h break`}
        </div>
      )}
      
      <Button
        variant={isCheckedIn || isOnBreak ? "outline" : "destructive"}
        disabled={isPending}
        onClick={handleClockAction}
        className={`font-bold px-6 py-2 h-auto text-xs tracking-wider rounded-sm shadow-lg ${
          isCheckedIn || isOnBreak
            ? "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
        }`}
      >
        {isPending ? (
          <LoadingSpinner size="sm" />
        ) : isCheckedIn || isOnBreak ? (
          "WEB CLOCK-OUT"
        ) : (
          "WEB CLOCK-IN"
        )}
      </Button>
    </div>
  );
}
