"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { fadeUp } from "@/lib/motion-variants";

interface TaskRepStat {
  assigneeId: string | null;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface TaskAnalyticsData {
  period: number;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
  perRep: TaskRepStat[];
}

interface TaskAnalyticsCardProps {
  taskAnalytics: TaskAnalyticsData;
}

export function TaskAnalyticsCard({ taskAnalytics }: TaskAnalyticsCardProps) {
  return (
    <motion.div variants={fadeUp}>
      <Card>
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Task Analytics (Last 30 Days)</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <StatCardGrid cols={3} className="mb-4">
            <StatCard
              label="Completion Rate"
              value={`${taskAnalytics.completionRate}%`}
              tone="emerald"
            />
            <StatCard
              label="Overdue"
              value={taskAnalytics.overdue}
              tone="red"
            />
            <StatCard
              label="Total Tasks"
              value={taskAnalytics.total}
              tone="default"
            />
          </StatCardGrid>
          {taskAnalytics.perRep.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Per Rep
              </p>
              {taskAnalytics.perRep.slice(0, 8).map((rep) => (
                <div key={rep.assigneeId} className="flex items-center gap-3">
                  <p className="text-[11px] font-medium w-32 truncate shrink-0">
                    {rep.name}
                  </p>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full w-full rounded-full bg-blue-600 origin-left transition-transform duration-300"
                      style={{ transform: `scaleX(${rep.completionRate / 100})` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums w-10 text-right shrink-0">
                    {rep.completionRate}%
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums w-12 text-right shrink-0">
                    {rep.completed}/{rep.total}
                  </span>
                  {rep.overdue > 0 && (
                    <span className="text-[10px] text-destructive shrink-0">
                      {rep.overdue} late
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
