"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ArrowLeft, ExternalLink, BarChart2, CheckCircle, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReviewCycles } from "@/hooks/api/hr";
import type { ReviewCycle } from "@/types/hr";

const CHART_COLORS = ["#7c3aed", "#4f46e5", "#64748b", "#9333ea"];

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({ label, value, icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </motion.div>
  );
}

export default function PerformanceAnalyticsPage() {
  const { data: cycles = [], isLoading } = useReviewCycles();

  const activeCycles = cycles.filter((c: ReviewCycle) => c.status === "ACTIVE").length;

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    cycles.forEach((c: ReviewCycle) => {
      const key = c.type ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [cycles]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    cycles.forEach((c: ReviewCycle) => {
      const key = c.status ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cycles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-3">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-16 bg-slate-300 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-6 h-72 animate-pulse" />
          <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-6 h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link href="/hr/performance">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Performance
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review cycle insights and metrics</p>
          </div>
        </div>
        <Link href="/hr/analytics">
          <Button variant="outline" size="sm" className="text-violet-600 border-violet-200 hover:bg-violet-50">
            Full Analytics
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Review Cycles"
          value={cycles.length}
          icon={<BarChart2 className="w-4 h-4 text-violet-600" />}
          color="bg-violet-100"
          delay={0.05}
        />
        <StatCard
          label="Active Cycles"
          value={activeCycles}
          icon={<CheckCircle className="w-4 h-4 text-green-600" />}
          color="bg-green-100"
          delay={0.1}
        />
        <StatCard
          label="Avg Rating"
          value="—"
          icon={<Star className="w-4 h-4 text-amber-500" />}
          color="bg-amber-100"
          delay={0.15}
        />
        <StatCard
          label="OKR Progress"
          value="—"
          icon={<Target className="w-4 h-4 text-indigo-600" />}
          color="bg-indigo-100"
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.25 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6"
        >
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cycles by Type</h2>
          {typeData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                  cursor={{ fill: "#f8f7ff" }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.3 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6"
        >
          <h2 className="text-base font-semibold text-slate-800 mb-4">Status Distribution</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
              No data available
            </div>
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
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#64748b", fontSize: "12px" }}>{value}</span>
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
        transition={{ duration: 0.22, ease: "easeOut", delay: 0.35 }}
        className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Review Cycles</h2>
        </div>
        {cycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <BarChart2 className="w-10 h-10 text-slate-300" />
            <p className="text-sm">No review cycles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Period</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle: ReviewCycle) => (
                  <tr key={cycle.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{cycle.name}</td>
                    <td className="px-6 py-3">
                      <Badge className="text-xs bg-violet-100 text-violet-700">{cycle.type}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge className={`text-xs ${CYCLE_STATUS_STYLES[cycle.status ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                        {cycle.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date(cycle.periodStart).toLocaleDateString()} — {new Date(cycle.periodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
