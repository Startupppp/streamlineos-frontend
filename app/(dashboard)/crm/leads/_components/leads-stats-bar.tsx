"use client";

import { Users, TrendingUp, UserPlus, Target, UserCheck, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeadsStatsBarProps {
  stats: {
    total: number;
    thisMonth: number;
    byStatus: { QUALIFIED: number; CONVERTED: number; [key: string]: number };
    conversionRate: number;
    unassigned: number;
  };
}

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  const items = [
    { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-400" },
    { label: "New This Month", value: stats.thisMonth, icon: Zap, color: "text-emerald-400" },
    { label: "Qualified", value: stats.byStatus.QUALIFIED, icon: Target, color: "text-purple-400" },
    { label: "Converted", value: stats.byStatus.CONVERTED, icon: UserCheck, color: "text-green-400" },
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-amber-400" },
    { label: "Unassigned", value: stats.unassigned, icon: UserPlus, color: "text-red-400" },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {items.map((stat) => (
        <Card key={stat.label} className="shadow-noir border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <stat.icon className={cn("h-5 w-5", stat.color)} />
              <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
