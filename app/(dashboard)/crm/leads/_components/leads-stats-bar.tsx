"use client";

import { Users, TrendingUp, UserPlus, Target, UserCheck, Zap, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatINRCompact } from "@/lib/format-utils";
import { STATUS_CONFIG } from "./leads-constants";

interface LeadsStatsBarProps {
  stats: {
    total: number;
    thisMonth: number;
    byStatus: { QUALIFIED: number; CONVERTED: number; [key: string]: number };
    conversionRate: number;
    unassigned: number;
    totalPotentialValue: number;
  };
}

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  const items = [
    { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-400" },
    { label: "New This Month", value: stats.thisMonth, icon: Zap, color: "text-emerald-400" },
    { label: "Qualified", value: stats.byStatus.QUALIFIED, icon: Target, color: "text-purple-400" },
    { label: "Converted", value: stats.byStatus.CONVERTED, icon: UserCheck, color: "text-green-400" },
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-amber-400" },
    { label: "Pipeline Value", value: formatINRCompact(stats.totalPotentialValue), icon: DollarSign, color: "text-gold" },
    { label: "Unassigned", value: stats.unassigned, icon: UserPlus, color: "text-red-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {items.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-lg font-bold tabular-nums">{stat.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(stats.byStatus).map(([status, count]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          if (!config) return null;
          return (
            <div
              key={status}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border",
                config.bg, config.color, config.border,
              )}
            >
              <span className="font-medium">{config.label}</span>
              <span className="font-bold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
