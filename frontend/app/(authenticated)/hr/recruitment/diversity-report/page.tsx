"use client";

import { useState, useCallback } from "react";
import { useDiversityReport, type DiversityFilters } from "@/hooks/api/hr/recruitment";
import { useHrDepartments } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { ChevronDown, AlertCircle, Users, BarChart3, MapPin, Globe } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { Department } from "@/types/hr";

const GENDER_COLORS: Record<string, string> = {
  MALE: "bg-blue-500",
  FEMALE: "bg-pink-500",
  OTHER: "bg-blue-500",
  PREFER_NOT_TO_SAY: "bg-slate-400",
  Unknown: "bg-slate-300",
};

function HorizontalBar({
  items,
  total,
  colorFn,
}: {
  items: { label: string; count: number }[];
  total: number;
  colorFn?: (label: string) => string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        const color = colorFn?.(item.label) ?? "bg-primary";
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-32 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-16 text-right shrink-0">
              {item.count}{" "}
              <span className="text-muted-foreground">
                ({Math.round(pct)}%)
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DeptCheckboxItem({
  dept,
  checked,
  onToggle,
}: {
  dept: Department;
  checked: boolean;
  onToggle: (id: number) => void;
}) {
  const handleChange = useCallback(
    () => onToggle(dept.id),
    [dept.id, onToggle],
  );
  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={handleChange}>
      {dept.name}
    </DropdownMenuCheckboxItem>
  );
}

export default function DiversityReportPage() {
  const { data: departments } = useHrDepartments();

  const [filters, setFilters] = useState<DiversityFilters>({
    from: "",
    to: "",
    departmentIds: [],
  });
  const [pendingFilters, setPendingFilters] = useState<DiversityFilters>({
    from: "",
    to: "",
    departmentIds: [],
  });

  const { data, isLoading, isError, refetch } = useDiversityReport(filters);

  const handleApply = useCallback(() => {
    setFilters({ ...pendingFilters });
  }, [pendingFilters]);

  const handleReset = useCallback(() => {
    const cleared: DiversityFilters = { from: "", to: "", departmentIds: [] };
    setPendingFilters(cleared);
    setFilters(cleared);
  }, []);

  const handleFromChange = useCallback(
    (value: string) => {
      setPendingFilters((p) => ({ ...p, from: value }));
    },
    [],
  );

  const handleToChange = useCallback(
    (value: string) => {
      setPendingFilters((p) => ({ ...p, to: value }));
    },
    [],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const toggleDept = useCallback((id: number) => {
    setPendingFilters((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((d) => d !== id)
        : [...prev.departmentIds, id],
    }));
  }, []);

  const hasActiveFilters =
    filters.from || filters.to || filters.departmentIds.length > 0;

  return (
    <PageWrapper
      title="Diversity Report"
      subtitle="Anonymized applicant pool demographics"
      variant="display"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DatePicker value={pendingFilters.from ?? ""} onChange={handleFromChange} placeholder="From date" className="text-xs w-36" />
          <DatePicker value={pendingFilters.to ?? ""} onChange={handleToChange} placeholder="To date" className="text-xs w-36" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs min-w-[140px] justify-between"
              >
                {pendingFilters.departmentIds.length === 0
                  ? "All Departments"
                  : `${pendingFilters.departmentIds.length} selected`}
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-52 max-h-56 overflow-y-auto"
            >
              {(departments ?? []).map((dept) => (
                <DeptCheckboxItem
                  key={dept.id}
                  dept={dept}
                  checked={pendingFilters.departmentIds.includes(dept.id)}
                  onToggle={toggleDept}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="text-xs" onClick={handleApply}>
            Apply
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
          {hasActiveFilters && filters.from && (
            <Badge variant="secondary" className="text-[10px]">From: {filters.from}</Badge>
          )}
          {hasActiveFilters && filters.to && (
            <Badge variant="secondary" className="text-[10px]">To: {filters.to}</Badge>
          )}
          {hasActiveFilters && filters.departmentIds.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.departmentIds.length} dept{filters.departmentIds.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      }
    >

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
          <AlertCircle className="h-10 w-10 text-destructive/50" />
          <p className="text-sm text-muted-foreground">
            Failed to load diversity report.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : !data || data.total === 0 ? (
        <RecruitmentEmptyState
          illustrationPreset="chart"
          title="No applicant data found"
          description="Adjust the filters or wait for candidates to apply."
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <>
          <StatCardGrid cols={4} className="mb-6">
            <StatCard label="Total Applicants" value={data.total} icon={Users} tone="blue" />
            <StatCard label="Gender Categories" value={data.genderBreakdown.length} icon={BarChart3} tone="default" />
            <StatCard label="Locations" value={data.locationBreakdown.length} icon={MapPin} tone="emerald" />
            <StatCard label="Sources" value={data.sourceBreakdown.length} icon={Globe} tone="amber" />
          </StatCardGrid>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.genderBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No gender data recorded yet.
                  </p>
                ) : (
                  <HorizontalBar
                    items={data.genderBreakdown.map((g) => ({
                      label: g.gender,
                      count: g.count,
                    }))}
                    total={data.total}
                    colorFn={(label) => GENDER_COLORS[label] ?? "bg-muted-foreground"}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Location Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.locationBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No location data recorded yet.
                  </p>
                ) : (
                  <HorizontalBar
                    items={data.locationBreakdown.map((l) => ({
                      label: l.location,
                      count: l.count,
                    }))}
                    total={data.total}
                    colorFn={() => "bg-emerald-500"}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  items={data.sourceBreakdown.map((s) => ({
                    label: s.source,
                    count: s.count,
                  }))}
                  total={data.total}
                  colorFn={() => "bg-primary"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Pipeline Stage Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  items={data.stageBreakdown.map((s) => ({
                    label: s.stage,
                    count: s.count,
                  }))}
                  total={data.total}
                  colorFn={() => "bg-amber-500"}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
