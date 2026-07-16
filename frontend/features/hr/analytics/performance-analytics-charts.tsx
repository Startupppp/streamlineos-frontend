"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";

const CHART_COLORS = ["#1d4ed8", "#06b6d4", "#60a5fa", "#8b5cf6"];

interface PerformanceAnalyticsChartsProps {
  typeData: Array<{ name: string; count: number }>;
  statusData: Array<{ name: string; value: number }>;
  ratingDist: Array<{ rating: string; count: number }>;
  hasReviews: boolean;
}

export function PerformanceAnalyticsCharts({
  typeData,
  statusData,
  ratingDist,
  hasReviews,
}: PerformanceAnalyticsChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.25 }}
          className="bg-card border border-border rounded-lg shadow-sm p-6"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Cycles by Type</h2>
          {typeData.length === 0 ? (
            <ChartEmptyState height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.3 }}
          className="bg-card border border-border rounded-lg shadow-sm p-6"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Status Distribution</h2>
          {statusData.length === 0 ? (
            <ChartEmptyState height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut", delay: 0.32 }}
        className="bg-card border border-border rounded-lg shadow-sm p-6"
      >
        <h2 className="text-base font-semibold text-foreground mb-4">Rating Distribution</h2>
        {!hasReviews ? (
          <ChartEmptyState height={180} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ratingDist} barSize={32}>
              <XAxis dataKey="rating" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </>
  );
}
