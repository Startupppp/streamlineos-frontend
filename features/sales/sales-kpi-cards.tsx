"use client";

import { motion } from "framer-motion";
import { DollarSign, Trophy, TrendingUp, Target, Filter, Users, UserX, Phone, CalendarClock, Mail, MapPin, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "@/components/charts/metric-card";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import { sparkColors } from "@/lib/theme-constants";
import type { EnhancedSalesMetrics } from "@/types/crm/deals";

type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "ytd";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
  ytd: "Year to Date",
};

interface TrendInfo {
  value: number;
  isPositive: boolean;
}

interface RepOption {
  id: number;
  name: string;
}

interface SalesKpiCardsProps {
  datePreset: DatePreset;
  dateRange: { from?: string; to?: string };
  repId: number | undefined;
  repOptions: RepOption[];
  kpiPipeline: number;
  kpiDealsWon: number;
  kpiCloseRate: number;
  kpiAvgDeal: number;
  kpiPipelineTrend: TrendInfo;
  kpiCloseRateTrend: TrendInfo;
  kpiAvgDealTrend: TrendInfo;
  dealsWonTrend: TrendInfo;
  revenueSparkData: number[];
  enhanced: EnhancedSalesMetrics | undefined;
  onDatePresetChange: (value: string) => void;
  onRepChange: (value: string) => void;
}

export function SalesKpiCards({
  datePreset,
  dateRange,
  repId,
  repOptions,
  kpiPipeline,
  kpiDealsWon,
  kpiCloseRate,
  kpiAvgDeal,
  kpiPipelineTrend,
  kpiCloseRateTrend,
  kpiAvgDealTrend,
  dealsWonTrend,
  revenueSparkData,
  enhanced,
  onDatePresetChange,
  onRepChange,
}: SalesKpiCardsProps) {
  return (
    <>
      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter:</span>
              </div>

              <Select value={datePreset} onValueChange={onDatePresetChange}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(DATE_PRESET_LABELS) as [DatePreset, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              {repOptions.length > 0 && (
                <Select
                  value={repId !== undefined ? String(repId) : "all"}
                  onValueChange={onRepChange}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="All Reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Reps
                    </SelectItem>
                    {repOptions.map((rep) => (
                      <SelectItem key={rep.id} value={String(rep.id)} className="text-xs">
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {datePreset !== "all" && (
                <span className="text-xs text-muted-foreground">
                  {DATE_PRESET_LABELS[datePreset]}
                  {dateRange.from && dateRange.to && (
                    <> · {dateRange.from} → {dateRange.to}</>
                  )}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(kpiPipeline)}
          icon={DollarSign}
          trend={kpiPipelineTrend}
          sparkData={revenueSparkData}
          sparkColor={sparkColors.blue}
        />
        <MetricCard
          label="Deals Won"
          value={kpiDealsWon}
          icon={Trophy}
          trend={dealsWonTrend}
          sparkColor={sparkColors.green}
        />
        <MetricCard
          label="Close Rate"
          value={`${kpiCloseRate}%`}
          icon={TrendingUp}
          trend={kpiCloseRateTrend}
          sparkColor={sparkColors.purple}
        />
        <MetricCard
          label="Avg Deal Size"
          value={formatCurrency(kpiAvgDeal)}
          icon={Target}
          trend={kpiAvgDealTrend}
          sparkColor={sparkColors.amber}
        />
      </motion.div>

      {enhanced && (
        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Live CRM Metrics (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
                {[
                  { label: "Active Clients", value: enhanced.activeClients, icon: Users, color: "text-emerald-500" },
                  { label: "Inactive Clients", value: enhanced.inactiveClients, icon: UserX, color: "text-red-400" },
                  { label: "Total Calls", value: enhanced.totalCalls, icon: Phone, color: "text-blue-500" },
                  { label: "Meetings", value: enhanced.totalMeetings, icon: CalendarClock, color: "text-purple-500" },
                  { label: "Emails Sent", value: enhanced.totalEmails, icon: Mail, color: "text-amber-500" },
                  { label: "Site Visits", value: enhanced.totalSiteVisits, icon: MapPin, color: "text-cyan-500" },
                  {
                    label: "Need Follow-up",
                    value: enhanced.followUpNeeded,
                    icon: AlertCircle,
                    color: enhanced.followUpNeeded > 0 ? "text-red-500" : "text-muted-foreground",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-muted/30"
                  >
                    <m.icon className={cn("h-5 w-5", m.color)} />
                    <span className="text-2xl font-bold text-foreground">{m.value}</span>
                    <span className="text-[11px] text-muted-foreground text-center leading-tight">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}
