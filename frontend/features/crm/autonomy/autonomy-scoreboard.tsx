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
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { KIND_LABELS, type ScoreboardKindRow } from "@/types/crm/autonomy";

/**
 * A correction rate is only readable next to how much it is based on.
 *
 * "0%" over three actions and "0%" over four hundred are different claims, and
 * showing them identically is how a scoreboard becomes reassuring rather than
 * informative.
 */
function rateText(rate: number | null, denominator: number): string {
  if (rate === null) return "—";
  if (denominator < 10) return `${Math.round(rate * 100)}% of ${denominator}`;
  return `${Math.round(rate * 100)}%`;
}

/**
 * Tone by how much correction the action type needed.
 *
 * Thresholds rather than a gradient: a manager is deciding whether to leave
 * something switched on, which is a yes/no, and a continuous colour ramp invites
 * reading precision that is not there.
 */
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

/**
 * How often the system is right, as numbers that move.
 *
 * With no approval gate anywhere, this is the evidence a tenant has for
 * enabling an action type — and the strongest argument anyone will make for
 * trusting the product.
 */
export function AutonomyScoreboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAutonomyScoreboard(days);

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
        {isLoading ? (
          <div className="flex flex-col gap-gap-field" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div>
              {data?.perKind.map((row) => (
                <KindRow key={row.kind} row={row} />
              ))}
            </div>

            {/* Spend, so an unprofitable tenant is visible before the invoice. */}
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
