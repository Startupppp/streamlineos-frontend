"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Users, MapPin, Globe, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

interface DiversityReport {
  total: number;
  genderBreakdown: { gender: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  stageBreakdown: { stage: string; count: number }[];
}

function useDiversityReport() {
  return useQuery<DiversityReport>({
    queryKey: queryKeys.hr.diversityReport(),
    queryFn: () => apiClient.get<DiversityReport>("/hr/recruitment/diversity-report"),
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
            <span className="text-xs tabular-nums w-12 text-right">
              {item.count} <span className="text-muted-foreground">({Math.round(pct)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DiversityReportPage() {
  const { data, isLoading } = useDiversityReport();

  return (
    <PageWrapper
      title="Diversity Report"
      subtitle="Anonymized applicant pool demographics"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/recruitment">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
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
            <StatCard label="Total Applicants" value={data.total} icon={Users} color="blue" index={0} />
            <StatCard label="Gender Categories" value={data.genderBreakdown.length} icon={Users} color="violet" index={1} />
            <StatCard label="Locations" value={data.locationBreakdown.length} icon={MapPin} color="green" index={2} />
            <StatCard label="Sources" value={data.sourceBreakdown.length} icon={Globe} color="cyan" index={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Gender Distribution
                </CardTitle>
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location Distribution
                </CardTitle>
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Source Breakdown
                </CardTitle>
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Pipeline Stage Distribution
                </CardTitle>
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
