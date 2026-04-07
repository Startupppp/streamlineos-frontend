"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { WfhBalancesCard } from "@/features/hr/attendance/wfh-balances-card";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden"
    >
      {/* Left column — fixed width on desktop, scrolls independently */}
      <motion.div
        variants={fadeUp}
        className="lg:w-80 xl:w-96 shrink-0 space-y-5 pb-6 lg:overflow-y-auto lg:min-h-0 scrollbar-thin"
      >
        <TimerCard />
        <WfhBalancesCard />
      </motion.div>

      {/* Right column — fills remaining space, scrolls independently */}
      <motion.div
        variants={fadeUp}
        className="flex-1 min-w-0 space-y-5 pb-6 lg:overflow-y-auto lg:min-h-0 scrollbar-thin"
      >
        <AttendanceCalendar userId={userId} />
        {isAdmin && <ManageHolidaysCard />}
        <DailyHistoryTable />
      </motion.div>
    </motion.div>
  );
}
