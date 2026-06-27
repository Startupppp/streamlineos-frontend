"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrDepartments } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DiversityReport {
  total: number;
  genderBreakdown: { gender: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  stageBreakdown: { stage: string; count: number }[];
}

interface DiversityFilters {
  from: string;
  to: string;
  departmentIds: number[];
}

function useDiversityReport(filters: DiversityFilters) {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.departmentIds.length > 0) params.departmentIds = filters.departmentIds.join(",");

  return useQuery<DiversityReport>({
    queryKey: [...queryKeys.hr.diversityReport(), params],
    queryFn: () => apiClient.get<DiversityReport>("/hr/recruitment/diversity-report", params),
    staleTime: 5 * 60 * 1000,
  });
}

const GENDER_COLORS: Record<string, string> = {
  MALE: "bg-blue-500",
  FEMALE: "bg-pink-500",
  OTHER: "bg-purple-500",
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
            <span className="text-xs text-muted-foreground w-32 truncate text-right">{item.label}</span>
            <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-16 text-right shrink-0">
              {item.count} <span className="text-muted-foreground">({Math.round(pct)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
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

  const { data, isLoading } = useDiversityReport(filters);

  const handleApply = useCallback(() => {
    setFilters({ ...pendingFilters });
  }, [pendingFilters]);

  const handleReset = useCallback(() => {
    const cleared = { from: "", to: "", departmentIds: [] };
    setPendingFilters(cleared);
    setFilters(cleared);
  }, []);

  const toggleDept = useCallback((id: number) => {
    setPendingFilters((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((d) => d !== id)
        : [...prev.departmentIds, id],
    }));
  }, []);

  const hasActiveFilters = filters.from || filters.to || filters.departmentIds.length > 0;

  return (
    <PageWrapper
      title="Diversity Report"
      subtitle="Anonymized applicant pool demographics"
    >
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-lg border bg-card">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">From Date</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={pendingFilters.from}
            onChange={(e) => setPendingFilters((p) => ({ ...p, from: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">To Date</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={pendingFilters.to}
            onChange={(e) => setPendingFilters((p) => ({ ...p, to: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Departments</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs min-w-[140px] justify-between">
                {pendingFilters.departmentIds.length === 0
                  ? "All Departments"
                  : `${pendingFilters.departmentIds.length} selected`}
                <svg className="ml-2 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 max-h-56 overflow-y-auto">
              {(departments ?? []).map((dept) => (
                <DropdownMenuCheckboxItem
                  key={dept.id}
                  checked={pendingFilters.departmentIds.includes(dept.id)}
                  onCheckedChange={() => toggleDept(dept.id)}
                >
                  {dept.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={handleApply}>
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {filters.from && <Badge variant="secondary" className="text-[10px]">From: {filters.from}</Badge>}
            {filters.to && <Badge variant="secondary" className="text-[10px]">To: {filters.to}</Badge>}
            {filters.departmentIds.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {filters.departmentIds.length} dept{filters.departmentIds.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Failed to load report data.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            {[
              { label: "Total Applicants", value: data.total },
              { label: "Gender Categories", value: data.genderBreakdown.length },
              { label: "Locations", value: data.locationBreakdown.length },
              { label: "Sources", value: data.sourceBreakdown.length },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.genderBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No gender data recorded yet.</p>
                ) : (
                  <HorizontalBar
                    items={data.genderBreakdown.map((g) => ({ label: g.gender, count: g.count }))}
                    total={data.total}
                    colorFn={(label) => GENDER_COLORS[label] ?? "bg-slate-400"}
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
                  <p className="text-sm text-muted-foreground text-center py-4">No location data recorded yet.</p>
                ) : (
                  <HorizontalBar
                    items={data.locationBreakdown.map((l) => ({ label: l.location, count: l.count }))}
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
                  items={data.sourceBreakdown.map((s) => ({ label: s.source, count: s.count }))}
                  total={data.total}
                  colorFn={() => "bg-blue-500"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pipeline Stage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  items={data.stageBreakdown.map((s) => ({ label: s.stage, count: s.count }))}
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
