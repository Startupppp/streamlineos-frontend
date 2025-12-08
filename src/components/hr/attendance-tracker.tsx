"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Coffee, LogOut } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export type AttendanceStatus = "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";

interface AttendanceTrackerProps {
  initialStatus: AttendanceStatus;
  todayLog: any;
}

export function AttendanceTracker({ initialStatus, todayLog }: AttendanceTrackerProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  const utils = api.useUtils();
  const checkInMutation = api.hr.checkIn.useMutation({
      onSuccess: () => {
          toast.success("Checked In!");
          router.refresh();
      },
      onError: (e) => toast.error(e.message)
  });
  const checkOutMutation = api.hr.checkOut.useMutation({
      onSuccess: () => {
          toast.success("Checked Out!");
          router.refresh();
      },
      onError: (e) => toast.error(e.message)
  });
  const toggleBreakMutation = api.hr.toggleBreak.useMutation({
      onSuccess: () => {
          toast.success("Break status updated!");
          router.refresh();
      },
      onError: (e) => toast.error(e.message)
  });

  const loading = checkInMutation.isPending || checkOutMutation.isPending || toggleBreakMutation.isPending;

  useEffect(() => {
    // Timer logic
    if (todayLog?.checkIn && !todayLog?.checkOut && initialStatus !== "ON_BREAK") {
      const interval = setInterval(() => {
        const start = new Date(todayLog.checkIn).getTime();
        const now = new Date().getTime();
        const breakMs = (Number(todayLog.breakHours) || 0) * 60 * 60 * 1000;
        setElapsed(now - start - breakMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [todayLog, initialStatus]);

  const formatTime = (ms: number) => {
    if (ms < 0) return "00:00:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCheckIn = async () => {
    if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        checkInMutation.mutate({ location: { latitude, longitude } });
    }, (error) => {
        alert("Location required for Check-In");
        console.error(error);
    });
    } else {
    alert("Geolocation not supported");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-sidebar-border bg-sidebar text-sidebar-foreground">
      <CardHeader>
        <CardTitle className="text-center text-gold">Attendance Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
            <div className="text-5xl font-mono font-bold tracking-widest text-white">
                {initialStatus === "OFFLINE" ? "00:00:00" : formatTime(elapsed)}
            </div>
            <p className="text-sm text-zinc-400 mt-2">
                {initialStatus === "OFFLINE" ? "Not Checked In" : 
                 initialStatus === "ON_BREAK" ? "On Break" : 
                 initialStatus === "CHECKED_OUT" ? "Shift Completed" : "Working"}
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {initialStatus === "OFFLINE" && (
                <Button 
                    onClick={handleCheckIn} 
                    disabled={loading} 
                    className="col-span-2 bg-green-600 hover:bg-green-700 text-white h-12 text-lg">
                    <MapPin className="mr-2 h-5 w-5" /> Check In
                </Button>
            )}

            {(initialStatus === "PRESENT" || initialStatus === "ON_BREAK") && (
                <>
                     <Button 
                        onClick={() => toggleBreakMutation.mutate()} 
                        disabled={loading}
                        variant="outline"
                        className={cn("h-12 border-primary/20", initialStatus === "ON_BREAK" ? "bg-yellow-500/20 text-yellow-400" : "text-white hover:bg-white/10")}
                    >
                        <Coffee className="mr-2 h-5 w-5" /> 
                        {initialStatus === "ON_BREAK" ? "Resume Work" : "Take Break"}
                    </Button>

                    <Button 
                        onClick={() => checkOutMutation.mutate()} 
                        disabled={loading || initialStatus === "ON_BREAK"}
                        variant="destructive"
                        className="h-12"
                    >
                        <LogOut className="mr-2 h-5 w-5" /> Check Out
                    </Button>
                </>
            )}

             {initialStatus === "CHECKED_OUT" && (
                 <div className="col-span-2 text-center text-zinc-400 py-2 bg-white/5 rounded-lg">
                    See you tomorrow!
                 </div>
             )}
        </div>
        
        {todayLog && (
            <div className="text-xs text-zinc-500 flex justify-between px-2">
                <span>In: {todayLog.checkIn ? format(new Date(todayLog.checkIn), "hh:mm a") : "--"}</span>
                <span>Out: {todayLog.checkOut ? format(new Date(todayLog.checkOut), "hh:mm a") : "--"}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
