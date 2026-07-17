"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface EnrollmentStatusChartProps {
  data: Array<{ status: string; count: number }>;
  hasEnrollments: boolean;
}

export function EnrollmentStatusChart({ data, hasEnrollments }: EnrollmentStatusChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.32 }}
    >
      <Card className="bg-card border border-border rounded-lg shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Enrollment by Status
            </h2>
          </div>
          {hasEnrollments ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Enrollments"
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No enrollment data"
              description="Enroll in courses to see your progress here."
              compact
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
