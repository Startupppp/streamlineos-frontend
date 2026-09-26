"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useHrAnalytics,
  useHrAttritionAnalytics,
} from "@/hooks/api/hr/analytics";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
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
  Activity,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { WorkforceSection } from "@/features/hr/analytics/workforce-section";
import { AttendanceSection } from "@/features/hr/analytics/attendance-section";
import { LeaveSection } from "@/features/hr/analytics/leave-section";
import { AttritionSection } from "@/features/hr/analytics/attrition-section";
import { CommandCenterSection } from "@/features/hr/analytics/command-center-section";

type DateRange = "month" | "quarter" | "year";
type SectionTab = "command-center" | "workforce" | "attendance" | "leaves" | "attrition";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

const DATE_RANGE_VALUES: readonly DateRange[] = ["month", "quarter", "year"];
const SECTION_TAB_VALUES: readonly SectionTab[] = ["command-center", "workforce", "attendance", "leaves", "attrition"];

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
}> = [
  { value: "command-center", label: "Command center", icon: BarChart3 },
  { value: "workforce", label: "Workforce", icon: Users },
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
  attendanceLogs,
  isLoading,
}: {
  totalEmployees: number;
  attritionRate: string;
  attendanceLogs: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <StatCardGridSkeleton cols={3} />;
  }

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
    {
      label: "Attendance logs",
      value: attendanceLogs,
      icon: Activity,
      tone: "emerald",
    },
  ];

  return (
    <StatCardGrid cols={3}>
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
      <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)} aria-label="Date range">
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

  const {
    data,
    isLoading: isAnalyticsLoading,
    isError,
    error,
    refetch,
  } = useHrAnalytics();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { data: attritionData, isLoading: isAttritionLoading } =
    useHrAttritionAnalytics();

  const isTopLoading =
    isAnalyticsLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;

  const handleSectionChange = useCallback((v: string) => {
    if (isSectionTab(v)) setActiveSection(v);
  }, []);

  const pageState = usePageState({
    permission: "hr:analytics:read",
    isLoading: isAnalyticsLoading,
    isError,
    error,
    isEmpty: data !== undefined && data.headcount.total === 0,
  });

  return (
    <PageWrapper
      title="People analytics"
      subtitle="Workforce insights and operational metrics">
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        className={CONTENT_FILL_PANEL}
        loading={<StatCardGridSkeleton cols={3} />}
        empty={
          <EmptyState
            illustrationPreset="team"
            title="No people to report on yet"
            description="Analytics fill in as you add employees — headcount, attendance, leave and attrition all read from your people records."
            action={{ label: "Add your first employee", href: "/hr/onboarding" }}
            secondaryAction={{ label: "View people", href: "/hr/employees" }}
            className={CONTENT_FILL_PANEL}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <ExecutiveKPIs
            totalEmployees={totalEmployees}
            attritionRate={attritionRate}
            attendanceLogs={attendanceLogs}
            isLoading={isTopLoading}
          />

          <Tabs
            value={activeSection}
            onValueChange={handleSectionChange}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <PageTabsToolbar
              tabsDensity="labeled"
            // Six labelled tabs + the range select need ~1180px; below xl they
            // pushed the select off-screen at 768 and 1024 (measured).
            collapseBelow="xl"
              tabs={
                <TabsList>
                  {SECTION_TABS.map(({ value, label, icon: Icon }) => (
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
      </PageState>
    </PageWrapper>
  );
}
