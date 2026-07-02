"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useHrAnalytics } from "@/hooks/api/hr/analytics";

function StatCard({
  label,
  value,
  icon: Icon,
  index,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="bg-violet-100 dark:bg-violet-950/40 rounded-xl p-2">
          <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

export function LeaveAnalyticsClient() {
  const { data, isLoading } = useHrAnalytics();

  const leavesByStatus = Object.entries(data?.leaves?.byStatus ?? {}).map(([status, count]) => ({ status, count }));
  const leavesByMonth = data?.leaves?.byMonth ?? [];
  const totalLeaves = leavesByStatus.reduce((sum, s) => sum + s.count, 0);
  const pendingLeaves = leavesByStatus.find((s) => s.status === "PENDING")?.count ?? 0;

  return (
    <div className="space-y-6">
      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Leave Requests" value={totalLeaves} icon={Users} index={0} />
            <StatCard label="Pending Approval" value={pendingLeaves} icon={Clock} index={1} />
            <StatCard label="Months Tracked" value={leavesByMonth.length} icon={TrendingUp} index={2} />
          </div>
        )}

        {!isLoading && leavesByStatus.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.24 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Leaves by Status</h3>
            <div className="space-y-3">
              {leavesByStatus.map((item, i) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">{item.status}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalLeaves > 0 ? (item.count / totalLeaves) * 100 : 0}%` }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.06 }}
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!isLoading && leavesByMonth.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.32 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Leaves by Month</h3>
            <div className="flex items-end gap-2 h-32">
              {leavesByMonth.map((item: { month: string; count: number }, i: number) => {
                const max = Math.max(...leavesByMonth.map((m: { count: number }) => m.count), 1);
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.count / max) * 100}%` }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.04 }}
                      className="w-full bg-gradient-to-t from-violet-600 to-indigo-400 rounded-t-md min-h-[4px]"
                    />
                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                      {item.month?.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.4 }}
          className="rounded-2xl border border-violet-200 dark:border-violet-800/40 bg-violet-50/60 dark:bg-violet-950/20 p-4 flex items-center justify-between"
        >
          <p className="text-sm text-violet-700 dark:text-violet-300">
            Leave analytics data is loaded from the HR Analytics module.
          </p>
          <Button asChild size="sm" className="shrink-0 ml-4">
            <Link href="/hr/analytics">View Detailed Reports</Link>
          </Button>
        </motion.div>
    </div>
  );
}
