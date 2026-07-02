"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold">Task Analytics (Last 30 Days)</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-2xl font-bold">{taskAnalytics.completionRate}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">
                {taskAnalytics.overdue}
              </p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{taskAnalytics.total}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </div>
          {taskAnalytics.perRep.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Per Rep
              </p>
              {taskAnalytics.perRep.slice(0, 8).map((rep) => (
                <div key={rep.assigneeId} className="flex items-center gap-3">
                  <p className="text-xs font-medium w-32 truncate shrink-0">
                    {rep.name}
                  </p>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${rep.completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-10 text-right shrink-0">
                    {rep.completionRate}%
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">
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
