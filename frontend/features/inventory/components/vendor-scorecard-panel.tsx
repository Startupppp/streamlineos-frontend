"use client";

import { memo } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, Package, RotateCcw, ShieldAlert, Wallet } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ScorecardRate, VendorScorecard } from "@/types/inventory";

interface VendorScorecardPanelProps {
  scorecard: VendorScorecard | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

type StatTone = "default" | "blue" | "emerald" | "amber" | "red";

/**
 * C4. Every figure below is rendered exactly as the backend derived it.
 *
 * The one number this file computes is nothing: `percent` arrives already
 * rounded, `sampleSize` already counted. `Number(...)` appears once, to pick a
 * colour — a threshold comparison, never a displayed value — because deciding
 * that 90% is green is a presentation choice and does not belong in a service.
 */
function displayPercent(rate: ScorecardRate): string {
  return rate.percent === null ? "—" : `${rate.percent}%`;
}

/** "over 4 lines", or the reason there is nothing to say. */
function sampleHint(rate: ScorecardRate, unit: string): string {
  if (rate.percent === null) return `No ${unit} to measure`;
  const scale = `over ${rate.sampleSize} ${unit}`;
  return rate.sufficient ? scale : `${scale} — too few for a trend`;
}

function toneAbove(rate: ScorecardRate, good: number, fair: number): StatTone {
  if (rate.percent === null) return "default";
  const value = Number(rate.percent);
  if (value >= good) return "emerald";
  if (value >= fair) return "amber";
  return "red";
}

function toneBelow(rate: ScorecardRate, good: number, fair: number): StatTone {
  if (rate.percent === null) return "default";
  const value = Number(rate.percent);
  if (value <= good) return "emerald";
  if (value <= fair) return "amber";
  return "red";
}

export const VendorScorecardPanel = memo(function VendorScorecardPanel({
  scorecard,
  isLoading,
  error,
  onRetry,
}: VendorScorecardPanelProps) {
  const display = useOrgDisplay();

  if (error)
    return (
      <ErrorState
        title="Couldn't load supplier performance"
        description={getErrorMessage(error)}
        onRetry={onRetry}
        compact
      />
    );

  const leadTime = scorecard?.leadTime;
  const spend = scorecard?.spend;

  return (
    <div className="flex flex-col gap-3">
      <StatCardGrid cols={4}>
        <StatCard
          label="On-time delivery"
          value={scorecard ? displayPercent(scorecard.onTime) : "—"}
          hint={scorecard ? sampleHint(scorecard.onTime, "orders") : undefined}
          icon={CheckCircle2}
          tone={scorecard ? toneAbove(scorecard.onTime, 90, 70) : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Line fill rate"
          value={scorecard ? displayPercent(scorecard.lineFill) : "—"}
          hint={scorecard ? sampleHint(scorecard.lineFill, "lines") : undefined}
          icon={Package}
          tone={scorecard ? toneAbove(scorecard.lineFill, 95, 85) : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Unit fill rate"
          value={scorecard ? displayPercent(scorecard.unitFill) : "—"}
          hint={scorecard ? sampleHint(scorecard.unitFill, "lines") : undefined}
          icon={Package}
          tone={scorecard ? toneAbove(scorecard.unitFill, 95, 85) : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Lead time p90"
          value={leadTime ? `${leadTime.p90Days} days` : "—"}
          hint={
            leadTime
              ? leadTime.observations === 0
                ? "No receipts to measure"
                : `median ${leadTime.p50Days}d over ${leadTime.observations} receipts`
              : undefined
          }
          icon={Clock}
          tone={leadTime?.reliable ? "blue" : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Return rate"
          value={scorecard ? displayPercent(scorecard.returns) : "—"}
          hint={scorecard ? sampleHint(scorecard.returns, "returned lines") : undefined}
          icon={RotateCcw}
          tone={scorecard ? toneBelow(scorecard.returns, 2, 5) : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Rejected on receipt"
          value={scorecard ? displayPercent(scorecard.rejection) : "—"}
          hint={scorecard ? sampleHint(scorecard.rejection, "received lines") : undefined}
          icon={ShieldAlert}
          tone={scorecard ? toneBelow(scorecard.rejection, 1, 5) : "default"}
          isLoading={isLoading}
        />
        <StatCard
          label="Open purchase orders"
          value={scorecard?.openPoCount ?? 0}
          icon={FileText}
          tone="blue"
          isLoading={isLoading}
        />
        <StatCard
          label="Spend"
          value={
            spend ? formatMoneyCompact(spend.amount, { ...display, currency: spend.currency }) : "—"
          }
          hint={
            spend && spend.excludedCurrencies.length > 0
              ? `excludes ${spend.excludedCurrencies.join(", ")}`
              : undefined
          }
          icon={Wallet}
          tone="default"
          isLoading={isLoading}
        />
      </StatCardGrid>

      {scorecard && scorecard.notes.length > 0 ? (
        <ul
          className={cn(
            "flex flex-col gap-1.5 rounded-xl border p-3",
            statusToneClasses("warning").surface,
            statusToneClasses("warning").rule,
          )}
        >
          {scorecard.notes.map((note) => (
            <li
              key={note}
              className={cn(
                "flex items-start gap-2 text-dense",
                statusToneClasses("warning").ink,
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
