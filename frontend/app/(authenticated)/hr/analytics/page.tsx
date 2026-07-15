"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useHrAnalytics,
  useHrAttritionAnalytics,
} from "@/hooks/api/hr/analytics";
import { useRecruitmentStats } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingDown,
  Briefcase,
  Activity,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { WorkforceSection } from "@/features/hr/analytics/workforce-section";
import { RecruitmentSection } from "@/features/hr/analytics/recruitment-section";
import { AttendanceSection } from "@/features/hr/analytics/attendance-section";
import { LeaveSection } from "@/features/hr/analytics/leave-section";
import { AttritionSection } from "@/features/hr/analytics/attrition-section";
import { CommandCenterSection } from "@/features/hr/analytics/command-center-section";
import { cn } from "@/lib/utils";

type DateRange = "month" | "quarter" | "year";
type SectionTab = "command-center" | "workforce" | "recruitment" | "attendance" | "leaves" | "attrition";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

const DATE_RANGE_VALUES: readonly DateRange[] = ["month", "quarter", "year"];
const SECTION_TAB_VALUES: readonly SectionTab[] = ["command-center", "workforce", "recruitment", "attendance", "leaves", "attrition"];

function isDateRange(v: string): v is DateRange {
  return (DATE_RANGE_VALUES as readonly string[]).includes(v);
}

function isSectionTab(v: string): v is SectionTab {
  return (SECTION_TAB_VALUES as readonly string[]).includes(v);
}

const SECTION_TABS: Array<{
  value: SectionTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "command-center", label: "Command Center", icon: BarChart3 },
  { value: "workforce", label: "Workforce", icon: Users },
  { value: "recruitment", label: "Recruitment", icon: Briefcase },
  { value: "attendance", label: "Attendance", icon: Activity },
  { value: "leaves", label: "Leaves", icon: CalendarDays },
  { value: "attrition", label: "Attrition", icon: TrendingDown },
];

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "blue" | "emerald" | "amber" | "red";
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
    return <StatCardGridSkeleton cols={4} />;
  }

  const kpis: KpiItem[] = [
    {
      label: "Total Employees",
      value: totalEmployees,
      icon: Users,
      tone: "blue",
    },
    {
      label: "Attrition Rate",
      value: `${attritionRate}%`,
      icon: TrendingDown,
      tone: "red",
    },
    {
      label: "Open Positions",
      value: openPositions,
      icon: Briefcase,
      tone: "amber",
    },
    {
      label: "Attendance Logs",
      value: attendanceLogs,
      icon: Activity,
      tone: "emerald",
    },
  ];

  return (
    <StatCardGrid cols={4}>
      {kpis.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </StatCardGrid>
  );
}

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const handleChange = useCallback(
    (v: string) => {
      if (isDateRange(v)) onChange(v);
    },
    [onChange],
  );

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36 text-xs bg-muted/40 rounded-lg">
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

function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [activeSection, setActiveSection] = useState<SectionTab>("command-center");

  const analyticsYear = useMemo(() => CURRENT_YEAR, []);

  const analyticsMonth = useMemo(() => {
    if (dateRange === "month") return CURRENT_MONTH;
    if (dateRange === "quarter") return Math.ceil(CURRENT_MONTH / 3) * 3 - 2;
    return 1;
  }, [dateRange]);

  const { data, isLoading: isAnalyticsLoading, isError, refetch } = useHrAnalytics();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { data: recruitmentStats, isLoading: isRecruitmentLoading } =
    useRecruitmentStats();
  const { data: attritionData, isLoading: isAttritionLoading } =
    useHrAttritionAnalytics();

  const isTopLoading =
    isAnalyticsLoading || isRecruitmentLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const openPositions = recruitmentStats?.openJobs ?? 0;
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;

  const handleSectionChange = useCallback((v: string) => {
    if (isSectionTab(v)) setActiveSection(v);
  }, []);

  if (isError) {
    return (
      <PageWrapper
        title="HR Analytics"
        subtitle="Workforce insights and operational metrics"
      >
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load analytics"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and operational metrics"
      actions={<DateRangeSelector value={dateRange} onChange={setDateRange} />}
    >
      <div className="space-y-6">
        <ExecutiveKPIs
          totalEmployees={totalEmployees}
          attritionRate={attritionRate}
          openPositions={openPositions}
          attendanceLogs={attendanceLogs}
          isLoading={isTopLoading}
        />

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Detailed Analytics
            </h2>
          </div>

          <Tabs value={activeSection} onValueChange={handleSectionChange}>
            <div className="px-4 pt-3 border-b border-border pb-3">
              <TabsList className="h-8 rounded-lg border p-1 bg-muted/50 gap-0.5">
                {SECTION_TABS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="text-[11px] px-3 h-6 rounded-md gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="command-center" className="mt-0">
                <CommandCenterSection />
              </TabsContent>

              <TabsContent value="workforce" className="mt-0">
                <WorkforceSection data={data} isLoading={isAnalyticsLoading} />
              </TabsContent>

              <TabsContent value="recruitment" className="mt-0">
                <RecruitmentSection isLoading={isRecruitmentLoading} />
              </TabsContent>

              <TabsContent value="attendance" className="mt-0">
                <AttendanceSection
                  year={analyticsYear}
                  month={analyticsMonth}
                />
              </TabsContent>

              <TabsContent value="leaves" className="mt-0">
                <LeaveSection year={analyticsYear} />
              </TabsContent>

              <TabsContent value="attrition" className="mt-0">
                <AttritionSection isLoading={isAttritionLoading} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate permission="hr:analytics:read">
      <AnalyticsContent />
    </DashboardGate>
  );
}
