"use client";

import { memo } from "react";
import { GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useDemandBaseline,
  type DemandCategory,
  type ForecastBacktestResult,
} from "@/hooks/api/inventory/planning";
import { formatQuantity } from "./forecast-format";

const CATEGORY_TONE: Readonly<Record<DemandCategory, StatusTone>> = {
  smooth: "success",
  erratic: "info",
  intermittent: "warning",
  lumpy: "warning",
  no_demand: "neutral",
};

const CATEGORY_LABEL: Readonly<Record<DemandCategory, string>> = {
  smooth: "Smooth",
  erratic: "Erratic",
  intermittent: "Intermittent",
  lumpy: "Lumpy",
  no_demand: "No demand",
};

function methodSummary(result: ForecastBacktestResult): string {
  const mase = result.metrics.mase;
  const scaled = mase === null ? "" : ` · MASE ${formatQuantity(mase)}`;
  return `MAE ${formatQuantity(result.metrics.mae)}${scaled} over ${result.metrics.n} forecasts`;
}

interface MethodRowProps {
  role: string;
  result: ForecastBacktestResult;
  tone: StatusTone;
}

const MethodRow = memo(function MethodRow({ role, result, tone }: MethodRowProps) {
  const classes = statusToneClasses(tone);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <Badge
        variant="outline"
        className={cn("h-5 shrink-0 px-2 py-0.5 text-micro font-semibold", classes.rule, classes.ink)}
      >
        {role}
      </Badge>
      <span className="font-mono text-dense font-semibold text-foreground">{result.method}</span>
      <span className="text-micro tabular-nums text-muted-foreground">{methodSummary(result)}</span>
    </div>
  );
});

interface DemandBaselineNoteProps {
  productVariantId: number | null;
}

export const DemandBaselineNote = memo(function DemandBaselineNote({
  productVariantId,
}: DemandBaselineNoteProps) {
  const { data, isLoading, isError, error } = useDemandBaseline(productVariantId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-dense text-destructive">
        Demand baseline unavailable: {getErrorMessage(error)}
      </p>
    );
  }

  if (!data) return null;

  const classificationTone = statusToneClasses(CATEGORY_TONE[data.classification.category]);
  const disagrees =
    data.champion !== null &&
    data.unrestrictedBest !== null &&
    data.champion.method !== data.unrestrictedBest.method;
  const warning = statusToneClasses("warning");

  return (
    <div>
      <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
        Demand baseline
      </p>

      <div className="space-y-2 rounded-md border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-2 py-0.5 text-micro font-semibold",
              classificationTone.rule,
              classificationTone.ink,
            )}
          >
            {CATEGORY_LABEL[data.classification.category]}
          </Badge>
          <span className="text-micro tabular-nums text-muted-foreground">
            {data.periods} weekly periods · {data.classification.nonZeroPeriods} with demand · ADI{" "}
            {formatQuantity(data.classification.adi)} · CV² {formatQuantity(data.classification.cv2)}
          </span>
        </div>

        <p className="text-dense leading-relaxed text-muted-foreground">
          {data.classification.guidance}
        </p>

        <p className="text-micro text-muted-foreground">
          {data.seasonality.seasonLength === null
            ? "No season detected in the history."
            : `Season of ${data.seasonality.seasonLength} periods, autocorrelation ${formatQuantity(data.seasonality.strength)}.`}
        </p>

        {data.insufficientReason ? (
          <p className={cn("rounded-md border p-2 text-dense leading-relaxed", warning.surface, warning.rule, warning.ink)}>
            {data.insufficientReason}
          </p>
        ) : null}

        {data.champion ? (
          <MethodRow role="Chosen" result={data.champion} tone="success" />
        ) : null}

        {disagrees && data.unrestrictedBest ? (
          <div className={cn("space-y-1.5 rounded-md border p-2", warning.surface, warning.rule)}>
            <div className="flex items-center gap-1.5">
              <GitCompareArrows className={cn("h-3.5 w-3.5", warning.ink)} aria-hidden />
              <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Methods disagree
              </p>
            </div>
            <MethodRow role="Lowest error" result={data.unrestrictedBest} tone="warning" />
            {data.shapeNote ? (
              <p className={cn("text-dense leading-relaxed", warning.ink)}>{data.shapeNote}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
