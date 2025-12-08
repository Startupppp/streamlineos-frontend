"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/pre-ui/loading-spinner";

export function ClockInWidget() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  const utils = api.useUtils();
  const { data: statusData, isLoading } = api.hr.getAttendanceStatus.useQuery();
  
  const checkInMutation = api.hr.checkIn.useMutation({
    onSuccess: async () => {
      toast.success("Clocked in successfully!");
      await utils.hr.getAttendanceStatus.invalidate();
    },
    onError: (err) => {
        toast.error(err.message);
    }
  });

  const checkOutMutation = api.hr.checkOut.useMutation({
    onSuccess: async () => {
      toast.success("Clocked out successfully!");
      await utils.hr.getAttendanceStatus.invalidate();
    },
    onError: (err) => {
        toast.error(err.message);
    }
  });

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null; 

  const isCheckedIn = statusData?.status === "PRESENT";
  const isCheckedOut = statusData?.status === "CHECKED_OUT";

  const handleClockAction = () => {
      if (isCheckedIn) {
          checkOutMutation.mutate();
      } else if (!isCheckedOut) { // Only allow check in if not already checked out (assuming 1 shift per day for MVP)
          checkInMutation.mutate({}); // No location for now
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
