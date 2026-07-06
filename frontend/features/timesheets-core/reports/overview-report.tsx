"use client";

import { Clock, TrendingUp, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ByDayChart, ByProjectChart } from "./report-charts";
import type { ReportOverview } from "@/features/timesheets-core/types";

interface OverviewReportProps {
  overview: ReportOverview | undefined;
  isLoading: boolean;
}

export function OverviewReport({ overview, isLoading }: OverviewReportProps) {
  const totalHours = overview?.totalHours ?? 0;
  const billableRatio = overview?.billableRatio ?? 0;
  const approvedHours = overview?.approvedHours ?? 0;
  const pendingApprovalHours = overview?.pendingApprovalHours ?? 0;
  const pendingPeriods = overview?.pendingPeriods ?? 0;
  const activeUsers = overview?.activeUsers ?? 0;
  const byDay = overview?.byDay ?? [];
  const byProject = overview?.byProject ?? [];

  return (
    <div className="space-y-4">
      <StatCardGrid cols={4}>
        <StatCard
          label="Total Hours"
          value={isLoading ? "-" : totalHours.toFixed(1)}
          icon={Clock}
          tone="blue"
          isLoading={isLoading}
        />
        <StatCard
          label="Billable Ratio"
          value={isLoading ? "-" : `${(billableRatio * 100).toFixed(1)}%`}
          icon={TrendingUp}
          tone="emerald"
          isLoading={isLoading}
        />
        <StatCard
          label="Approved Hours"
          value={isLoading ? "-" : approvedHours.toFixed(1)}
          icon={CheckCircle2}
          tone="emerald"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={isLoading ? "-" : pendingApprovalHours.toFixed(1)}
          icon={AlertTriangle}
          tone="amber"
          hint={pendingPeriods > 0 ? `${pendingPeriods} periods` : undefined}
          isLoading={isLoading}
        />
      </StatCardGrid>

      <div className="grid gap-4 md:grid-cols-2">
        <ByDayChart data={byDay} isLoading={isLoading} />
        <ByProjectChart data={byProject} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Team Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Active Users"
              value={isLoading ? "-" : activeUsers}
              icon={Users}
              tone="blue"
              isLoading={isLoading}
            />
            <StatCard
              label="Pending Periods"
              value={isLoading ? "-" : pendingPeriods}
              icon={AlertTriangle}
              tone={pendingPeriods > 0 ? "amber" : "default"}
              hint={
                pendingPeriods > 0
                  ? `${pendingPeriods} period${pendingPeriods === 1 ? "" : "s"} need submission or approval`
                  : undefined
              }
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
