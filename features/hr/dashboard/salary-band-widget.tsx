"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { useHrSalaryBands } from "@/lib/api/hooks/hr/dashboard";

const SALARY_BAND_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

function formatLakh(n: number) {
  if (n >= 10_00_000) return `${(n / 10_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  return `${(n / 1000).toFixed(0)}K`;
}

export function SalaryBandWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data, isLoading } = useHrSalaryBands();

  if (!role || !SALARY_BAND_ROLES.includes(role)) return null;

  const maxCount = Math.max(...(data?.bandDistribution ?? []).map((b) => b.count), 1);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Salary Bands</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : !data || data.bandDistribution.every((b) => b.count === 0) ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No salary data yet</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Distribution
              </p>
              {data.bandDistribution.map((band) => (
                <div key={band.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{band.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue/70"
                      style={{ width: `${(band.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                    {band.count}
                  </span>
                </div>
              ))}
            </div>
            {data.byDepartment.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  Avg by Dept
                </p>
                {data.byDepartment.slice(0, 4).map((d) => (
                  <div
                    key={d.department}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-muted-foreground truncate flex-1">{d.department}</span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                      avg {formatLakh(d.avgAnnual)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
