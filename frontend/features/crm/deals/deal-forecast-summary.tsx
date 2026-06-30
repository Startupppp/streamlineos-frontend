"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINRCompact } from "@/lib/format-utils";
import type { Deal } from "@/types/crm";

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

interface DealForecastSummaryProps {
  deals: Deal[];
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

export function DealForecastSummary({ deals }: DealForecastSummaryProps) {
  const { totalPipeline, weightedForecast, commitForecast } = useMemo(() => {
    const open = deals.filter((d) => d.stage !== "LOST");
    let pipeline = 0;
    let weighted = 0;
    let commit = 0;

    for (const d of open) {
      const value = Number(d.value ?? 0);
      const prob =
        d.probability != null && d.probability > 0
          ? d.probability
          : (STAGE_PROBABILITY[d.stage] ?? 0);

      pipeline += value;
      weighted += value * (prob / 100);

      if (d.stage === "NEGOTIATION" || d.stage === "WON") {
        commit += value;
      }
    }

    return { totalPipeline: pipeline, weightedForecast: weighted, commitForecast: commit };
  }, [deals]);

  const stats: StatCard[] = [
    {
      label: "Total Pipeline",
      value: formatINRCompact(totalPipeline),
      icon: TrendingUp,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      label: "Weighted Forecast",
      value: formatINRCompact(weightedForecast),
      icon: Target,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
    },
    {
      label: "Commit Forecast",
      value: formatINRCompact(commitForecast),
      icon: Handshake,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, duration: 0.22, ease: "easeOut" }}
        >
          <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${stat.iconBg} shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold tabular-nums">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
