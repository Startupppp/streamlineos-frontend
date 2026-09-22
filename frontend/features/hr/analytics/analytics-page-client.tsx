"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useHrAnalytics,
  useHrAttritionAnalytics,
} from "@/hooks/api/hr/analytics";
import { useRecruitmentStats } from "@/hooks/api/hr/recruitment";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
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

type DateRange = "month" | "quarter" | "year";
type SectionTab = "command-center" | "workforce" | "recruitment" | "attendance" | "leaves" | "attrition";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

const DATE_RANGE_VALUES: readonly DateRange[] = ["month", "quarter", "year"];
const SECTION_TAB_VALUES: readonly SectionTab[] = ["command-center", "workforce", "recruitment", "attendance", "leaves", "attrition"];

function isDateRange(v: string): v is DateRange {
  return DATE_RANGE_VALUES.some((candidate) => candidate === v);
}

function isSectionTab(v: string): v is SectionTab {
  return SECTION_TAB_VALUES.some((candidate) => candidate === v);
}

const SECTION_TABS: Array<{
  value: SectionTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: "hr:interviews:view";
}> = [
  { value: "command-center", label: "Command center", icon: BarChart3 },
  { value: "workforce", label: "Workforce", icon: Users },
  { value: "recruitment", label: "Recruitment", icon: Briefcase, requiredPermission: "hr:interviews:view" },
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
  openPositions: number | null;
  attendanceLogs: number;
  isLoading: boolean;
}) {
  const cols = openPositions === null ? 3 : 4;
  if (isLoading) {
    return <StatCardGridSkeleton cols={cols} />;
  }

  const openPositionsKpi: KpiItem[] =
    openPositions === null
      ? []
      : [{ label: "Open positions", value: openPositions, icon: Briefcase, tone: "amber" }];
  const kpis: KpiItem[] = [
    {
      label: "Total employees",
      value: totalEmployees,
      icon: Users,
      tone: "blue",
    },
    {
      label: "Attrition rate",
      value: `${attritionRate}%`,
      icon: TrendingDown,
      tone: "red",
    },
    ...openPositionsKpi,
    {
      label: "Attendance logs",
      value: attendanceLogs,
      icon: Activity,
      tone: "emerald",
    },
  ];

  return (
    <StatCardGrid cols={cols}>
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
      <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="month">This Month</SelectItem>
        <SelectItem value="quarter">This Quarter</SelectItem>
        <SelectItem value="year">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AnalyticsPageClient() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [activeSection, setActiveSection] = useState<SectionTab>("command-center");

  const analyticsYear = useMemo(() => CURRENT_YEAR, []);

  const analyticsMonth = useMemo(() => {
    if (dateRange === "month") return CURRENT_MONTH;
    if (dateRange === "quarter") return Math.ceil(CURRENT_MONTH / 3) * 3 - 2;
    return 1;
  }, [dateRange]);

  const canViewRecruitment = useCan("hr:interviews:view");
  const { data, isLoading: isAnalyticsLoading, isError, error, refetch } = useHrAnalytics();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { data: recruitmentStats, isLoading: isRecruitmentLoading } =
    useRecruitmentStats();
  const { data: attritionData, isLoading: isAttritionLoading } =
    useHrAttritionAnalytics();

  const isTopLoading =
    isAnalyticsLoading || isRecruitmentLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const openPositions = canViewRecruitment ? (recruitmentStats?.openJobs ?? 0) : null;
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;
  const visibleTabs = SECTION_TABS.filter(
    (tab) => tab.requiredPermission === undefined || canViewRecruitment,
  );
  const selectedSection = visibleTabs.some((tab) => tab.value === activeSection)
    ? activeSection
    : "command-center";

  const handleSectionChange = useCallback((v: string) => {
    if (isSectionTab(v)) setActiveSection(v);
  }, []);

  if (isError) {
    return (
      <PageWrapper
        title="People analytics"
        subtitle="Workforce insights and operational metrics">
        <ErrorState
          className="flex-1"
          title="Failed to load analytics"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="People analytics"
      subtitle="Workforce insights and operational metrics">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <ExecutiveKPIs
          totalEmployees={totalEmployees}
          attritionRate={attritionRate}
          openPositions={openPositions}
          attendanceLogs={attendanceLogs}
          isLoading={isTopLoading}
        />

        <Tabs
          value={selectedSection}
          onValueChange={handleSectionChange}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <PageTabsToolbar
            tabsDensity="labeled"
            tabs={
              <TabsList>
                {visibleTabs.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
            filters={<DateRangeSelector value={dateRange} onChange={setDateRange} />}
          />

          <div className="rounded-2xl border border-border/70 bg-card/90 shadow-card overflow-hidden flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Detailed analytics
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <TabsContent value="command-center" className="mt-0 flex-none">
                <CommandCenterSection />
              </TabsContent>

              <TabsContent value="workforce" className="mt-0 flex-none">
                <WorkforceSection data={data} isLoading={isAnalyticsLoading} />
              </TabsContent>

              {canViewRecruitment ? (
                <TabsContent value="recruitment" className="mt-0 flex-none">
                  <RecruitmentSection isLoading={isRecruitmentLoading} />
                </TabsContent>
              ) : null}

              <TabsContent value="attendance" className="mt-0 flex-none">
                <AttendanceSection
                  year={analyticsYear}
                  month={analyticsMonth}
                />
              </TabsContent>

              <TabsContent value="leaves" className="mt-0 flex-none">
                <LeaveSection year={analyticsYear} />
              </TabsContent>

              <TabsContent value="attrition" className="mt-0 flex-none">
                <AttritionSection isLoading={isAttritionLoading} />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
