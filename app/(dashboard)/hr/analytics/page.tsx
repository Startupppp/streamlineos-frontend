"use client";

import { useMemo, useState } from "react";
import { useHrAnalytics, useHrAttritionAnalytics } from "@/lib/api/hooks/hr/analytics";
import { useRecruitmentStats } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, TrendingDown, Briefcase, Activity } from "lucide-react";
import { WorkforceSection } from "@/features/hr/analytics/workforce-section";
import { RecruitmentSection } from "@/features/hr/analytics/recruitment-section";
import { AttendanceSection } from "@/features/hr/analytics/attendance-section";
import { LeaveSection } from "@/features/hr/analytics/leave-section";
import { AttritionSection } from "@/features/hr/analytics/attrition-section";

type DateRange = "month" | "quarter" | "year";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  function handleChange(v: string) {
    onChange(v as DateRange);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)]">
        <SelectItem value="month">This Month</SelectItem>
        <SelectItem value="quarter">This Quarter</SelectItem>
        <SelectItem value="year">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ExecutiveKPIs({
  totalEmployees,
  attritionRate,
  openPositions,
  attendanceLogs,
  isLoading,
}: {
  totalEmployees: number;
  attritionRate: string;
  openPositions: number;
  attendanceLogs: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total Employees"
        value={totalEmployees}
        icon={Users}
        color="blue"
        index={0}
      />
      <StatCard
        label="Attrition Rate"
        value={`${attritionRate}%`}
        icon={TrendingDown}
        color="red"
        index={1}
      />
      <StatCard
        label="Open Positions"
        value={openPositions}
        icon={Briefcase}
        color="amber"
        index={2}
      />
      <StatCard
        label="Attendance Logs (Mo)"
        value={attendanceLogs}
        icon={Activity}
        color="green"
        index={3}
      />
    </div>
  );
}

function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const analyticsYear = useMemo(() => CURRENT_YEAR, []);

  const analyticsMonth = useMemo(() => {
    if (dateRange === "month") return CURRENT_MONTH;
    if (dateRange === "quarter") return Math.ceil(CURRENT_MONTH / 3) * 3 - 2;
    return 1;
  }, [dateRange]);

  const { data, isLoading: isAnalyticsLoading } = useHrAnalytics();
  const { data: recruitmentStats, isLoading: isRecruitmentLoading } = useRecruitmentStats();
  const { data: attritionData, isLoading: isAttritionLoading } = useHrAttritionAnalytics();

  const isTopLoading = isAnalyticsLoading || isRecruitmentLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const openPositions = recruitmentStats?.openJobs ?? 0;
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;

  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and metrics"
      actions={
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      }
    >
      <div className="space-y-6">
        <ExecutiveKPIs
          totalEmployees={totalEmployees}
          attritionRate={attritionRate}
          openPositions={openPositions}
          attendanceLogs={attendanceLogs}
          isLoading={isTopLoading}
        />

        <WorkforceSection data={data} isLoading={isAnalyticsLoading} />

        <RecruitmentSection isLoading={isRecruitmentLoading} />

        <AttendanceSection year={analyticsYear} month={analyticsMonth} />

        <LeaveSection year={analyticsYear} />

        <AttritionSection isLoading={isAttritionLoading} />
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <AnalyticsContent />
    </DashboardGate>
  );
}
