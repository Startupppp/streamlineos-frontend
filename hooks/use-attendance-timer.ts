import { useState, useEffect } from "react";
import { type TodayLog } from "../types/api";

export function useAttendanceTimer(todayLog: TodayLog | null, status: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (todayLog?.checkIn && !todayLog?.checkOut && status !== "ON_BREAK") {
      const interval = setInterval(() => {
        const start = new Date(todayLog.checkIn!).getTime();
        const now = new Date().getTime();
        const breakMs = (Number(todayLog.breakHours) || 0) * 60 * 60 * 1000;
        setElapsed(now - start - breakMs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [todayLog, status]);

  const formatTime = (ms: number) => {
    if (ms < 0) return "00:00:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return { elapsed, formatTime };
}
