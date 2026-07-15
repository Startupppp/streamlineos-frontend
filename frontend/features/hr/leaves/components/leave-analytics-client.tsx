"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import Link from "next/link";
import { useHrAnalytics } from "@/hooks/api/hr/analytics";

export function LeaveAnalyticsClient() {
  const { data, isLoading } = useHrAnalytics();

  const leavesByStatus = Object.entries(data?.leaves?.byStatus ?? {}).map(([status, count]) => ({ status, count }));
  const leavesByMonth = data?.leaves?.byMonth ?? [];
  const totalLeaves = leavesByStatus.reduce((sum, s) => sum + s.count, 0);
  const pendingLeaves = leavesByStatus.find((s) => s.status === "PENDING")?.count ?? 0;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <StatCardGridSkeleton cols={3} count={3} />
      ) : (
        <StatCardGrid cols={3}>
          <StatCard label="Total Leave Requests" value={totalLeaves} icon={Users} tone="blue" />
          <StatCard label="Pending Approval" value={pendingLeaves} icon={Clock} tone="amber" />
          <StatCard label="Months Tracked" value={leavesByMonth.length} icon={TrendingUp} tone="emerald" />
        </StatCardGrid>
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
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <span className="text-sm font-medium tabular-nums w-8 text-right">{item.count}</span>
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
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Trend</h3>
          <div className="space-y-2">
            {leavesByMonth.map((item, i) => (
              <div key={item.month} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.month}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {!isLoading && totalLeaves === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">No leave data available yet.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/leaves">Go to Leaves</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
