"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart } from "lucide-react";
import { useHrDiversityMetrics } from "@/lib/api/hooks/hr/dashboard";

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  NOT_SPECIFIED: "Not Specified",
};

const GENDER_COLORS: Record<string, string> = {
  MALE: "bg-blue-500",
  FEMALE: "bg-pink-500",
  OTHER: "bg-purple-500",
  NOT_SPECIFIED: "bg-muted",
};

export function DiversityWidget() {
  const { data, isLoading } = useHrDiversityMetrics();

  const totalGender = (data?.genderBreakdown ?? []).reduce((s, g) => s + g.count, 0);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <PieChart className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Diversity & Inclusion</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Gender
              </p>
              {(data?.genderBreakdown ?? []).map((g) => {
                const pct = totalGender > 0 ? Math.round((g.count / totalGender) * 100) : 0;
                return (
                  <div key={g.gender} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 truncate shrink-0">
                      {GENDER_LABELS[g.gender] ?? g.gender}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${GENDER_COLORS[g.gender] ?? "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                      {g.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Age Groups
              </p>
              {(data?.ageDistribution ?? []).map((a) => (
                <div key={a.range} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{a.range}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.max(4, (a.count / Math.max(totalGender, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                    {a.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
