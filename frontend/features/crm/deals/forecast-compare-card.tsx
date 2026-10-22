"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useForecastCompare } from "@/hooks/api/crm/deal-forecast";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoneyCompact } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ForecastCompareCardProps {
  periods: string[];
}

function figure(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" ? value : 0;
}

const UP = statusToneClasses("success").ink;
const DOWN = statusToneClasses("danger").ink;

export function ForecastCompareCard({ periods }: ForecastCompareCardProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const period = chosen ?? periods[0] ?? null;
  const compare = useForecastCompare(period);
  const money = useOrgDisplay();

  const rows = useMemo(() => {
    if (!compare.data) return [];
    const { baseline, current, delta } = compare.data;
    return [
      { label: "Weighted", base: figure(baseline, "totalWeighted"), now: figure(current, "totalWeighted"), delta: delta.totalWeighted, isMoney: true },
      { label: "Best case", base: figure(baseline, "totalBestCase"), now: figure(current, "totalBestCase"), delta: delta.totalBestCase, isMoney: true },
      { label: "Deals", base: figure(baseline, "totalDeals"), now: figure(current, "totalDeals"), delta: delta.totalDeals, isMoney: false },
    ];
  }, [compare.data]);

  function format(value: number, isMoney: boolean) {
    return isMoney ? formatMoneyCompact(value, money) : String(value);
  }

  if (compare.access.denied || periods.length === 0) return null;

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Snapshot vs today</CardTitle>
        <Select value={period ?? undefined} onValueChange={setChosen}>
          <SelectTrigger className="w-36" aria-label="Snapshot period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {compare.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : compare.isError ? (
          <p className="text-sm text-muted-foreground">{getErrorMessage(compare.error)}</p>
        ) : (
          <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Measure</span>
            <span className="text-right text-muted-foreground">Snapshot</span>
            <span className="text-right text-muted-foreground">Today</span>
            <span className="text-right text-muted-foreground">Change</span>
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <span>{row.label}</span>
                <span className="text-right font-mono tabular-nums">{format(row.base, row.isMoney)}</span>
                <span className="text-right font-mono tabular-nums">{format(row.now, row.isMoney)}</span>
                <span className={cn("text-right font-mono tabular-nums", row.delta > 0 && UP, row.delta < 0 && DOWN)}>
                  {row.delta > 0 ? "+" : ""}
                  {format(row.delta, row.isMoney)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
