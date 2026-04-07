"use client";

import { memo } from "react";
import { Clock, Users, FolderOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TeamSummaryProps {
  totalHours: number;
  uniqueEmployees: number;
  uniqueProjects: number;
  avgHoursPerDay: number;
  entryCount: number;
}

export const TeamSummary = memo(function TeamSummary({
  totalHours,
  uniqueEmployees,
  uniqueProjects,
  avgHoursPerDay,
  entryCount,
}: TeamSummaryProps) {
  const cards = [
    {
      title: "Total Hours",
      value: `${totalHours.toFixed(1)}h`,
      sub: `Across ${entryCount} entries`,
      icon: Clock,
    },
    {
      title: "Employees",
      value: String(uniqueEmployees),
      sub: "Team members logged time",
      icon: Users,
    },
    {
      title: "Projects",
      value: String(uniqueProjects),
      sub: "Active projects worked on",
      icon: FolderOpen,
    },
    {
      title: "Avg Hours/Day",
      value: `${avgHoursPerDay.toFixed(1)}h`,
      sub: "Average per working day",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
