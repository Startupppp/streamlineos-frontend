"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { TimerCard } from "./_components/check-in-button";
import { WfhBalancesCard } from "./_components/wfh-balances-card";
import { AttendanceCalendar } from "./_components/attendance-calendar";
import { ManageHolidaysCard } from "./_components/manage-holidays-card";
import { DailyHistoryTable } from "./_components/daily-history-table";

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0"
    >
      <motion.div variants={fadeUp} className="lg:col-span-4 space-y-6 overflow-y-auto pb-6 scrollbar-thin">
        <TimerCard />
        <WfhBalancesCard />
      </motion.div>

      <motion.div variants={fadeUp} className="lg:col-span-8 space-y-6 overflow-y-auto pb-6 scrollbar-thin">
        <AttendanceCalendar userId={userId} />
        {isAdmin && <ManageHolidaysCard />}
        <DailyHistoryTable />
      </motion.div>
    </motion.div>
  );
}
