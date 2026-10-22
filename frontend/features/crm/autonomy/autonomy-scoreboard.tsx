"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutonomyScoreboard } from "@/hooks/api/crm/autonomy";
import { NoPermissionState } from "@/components/shared";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { KIND_LABELS, type ScoreboardKindRow } from "@/types/crm/autonomy";
import { DatasetHealthPanel } from "./dataset-health-panel";

function rateText(rate: number | null, denominator: number): string {
  if (rate === null) return "—";
  if (denominator < 10) return `${Math.round(rate * 100)}% of ${denominator}`;
  return `${Math.round(rate * 100)}%`;
}

function rateTone(rate: number | null): StatusTone {
  if (rate === null) return "neutral";
  if (rate >= 0.2) return "danger";
  if (rate >= 0.05) return "warning";
  return "success";
}

function KindRow({ row }: { row: ScoreboardKindRow }) {
  const tone = statusToneClasses(rateTone(row.correctionRate));

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-gap-field border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{KIND_LABELS[row.kind]}</p>
        <p className="text-micro text-muted-foreground">
          {row.actions === 0
            ? "Has not happened yet"
            : `${row.actions} ${row.actions === 1 ? "action" : "actions"}, ${row.corrections} corrected`}
        </p>
      </div>

      <div className="flex items-baseline gap-4">
        {row.shadowScored > 0 ? (
          <div className="text-right">
            <p className="text-micro text-muted-foreground">Second opinion</p>
            <p className="text-sm tabular-nums">
              {row.shadowDisagreed} of {row.shadowScored} disagreed
            </p>
          </div>
        ) : null}

        <div className="text-right">
          <p className="text-micro text-muted-foreground">Corrected</p>
          <p className={cn("text-sm font-medium tabular-nums", tone.ink)}>
            {rateText(row.correctionRate, row.actions)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AutonomyScoreboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, access } = useAutonomyScoreboard(days);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-gap-field">
        <div>
          <CardTitle>How often it was right</CardTitle>
          <CardDescription>
            Every action the system took on its own, and how often a person had to change it.
          </CardDescription>
        </div>

        <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
          <SelectTrigger className="w-[150px]" aria-label="Time window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {access.denied ? (
          <NoPermissionState permission={access.permission} compact />
        ) : isLoading ? (
          <div className="flex flex-col gap-gap-field" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <p role="alert" className="text-label text-muted-foreground">
            These numbers could not be loaded. They are still being recorded —
            this is a problem reading them, not a gap in what was measured.
          </p>
        ) : (
          <>
            <div>
              {data?.perKind.map((row) => (
                <KindRow key={row.kind} row={row} />
              ))}
            </div>

            
            {data.dataset ? <DatasetHealthPanel trend={data.dataset} /> : null}

            
            {data ? (
              <p className="mt-4 text-micro text-muted-foreground">
                {data.spend.calls} model {data.spend.calls === 1 ? "call" : "calls"} ·{" "}
                {data.spend.totalTokens.toLocaleString()} tokens · about $
                {Number(data.spend.estimatedCostUsd).toFixed(2)} in this window
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
