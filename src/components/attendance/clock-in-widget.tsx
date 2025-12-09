"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useHrAttendanceStatus, useHrCheckIn, useHrCheckOut } from "@/lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/pre-ui/loading-spinner";

export function ClockInWidget() {
  const [now, setNow] = useState(new Date());

  const { data: statusData, isLoading } = useHrAttendanceStatus();
  
  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully!");
    },
    onError: (err) => {
        toast.error(err.message);
    }
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully!");
    },
    onError: (err) => {
        toast.error(err.message);
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); 
    return () => clearInterval(timer);
  }, []); 

  const isCheckedIn = statusData?.status === "PRESENT";
  const isCheckedOut = statusData?.status === "CHECKED_OUT";

  const handleClockAction = () => {
      if (isCheckedIn) {
          checkOutMutation.mutate();
      } else if (!isCheckedOut) {
          checkInMutation.mutate({ location: undefined });
      } else {
        toast.error("You have already completed your shift for today.");
      }
  };

  const isPending = checkInMutation.isPending || checkOutMutation.isPending || isLoading;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-white font-bold text-sm tracking-wide">
        {format(now, "EEE dd, MMM yyyy").toUpperCase()}
      </div>
      <Button 
        variant={isCheckedIn ? "outline" : "destructive"}
        disabled={isPending || isCheckedOut}
        onClick={handleClockAction}
        className={`font-bold px-6 py-2 h-auto text-xs tracking-wider rounded-sm shadow-lg ${
            isCheckedIn 
            ? "bg-transparent text-white border-white/20 hover:bg-white/10" 
            : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
        }`}
      >
        {isPending ? (
            <LoadingSpinner size="sm" />
        ) : isCheckedIn ? "WEB CLOCK-OUT" : isCheckedOut ? "COMPLETED" : "WEB CLOCK-IN"}
      </Button>
    </div>
  );
}
