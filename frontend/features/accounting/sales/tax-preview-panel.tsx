"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBasisPoints, formatMinorMoney } from "@/lib/accounting/money";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { TaxPreview, TaxProblem } from "@/types/accounting-ar-receipts";

interface TaxPreviewPanelProps {
  preview: TaxPreview | undefined;
  currency: string;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  error: Error | null;
}

function ProblemList({ problems, tone }: { problems: TaxProblem[]; tone: "danger" | "warning" }) {
  if (problems.length === 0) return null;
  const classes = statusToneClasses(tone);
  return (
    <ul className={cn("space-y-1 rounded-md border p-2", classes.surface, classes.rule)}>
      {problems.map((problem) => (
        <li key={`${problem.code}-${problem.documentLineId ?? "doc"}`} className="flex gap-2">
          <AlertTriangle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", classes.ink)} />
          <span className={cn("text-label", classes.ink)}>{problem.message}</span>
        </li>
      ))}
    </ul>
  );
}

function TotalRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={cn("text-label", emphasis ? "font-medium" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-sm font-semibold" : "text-label",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TaxPreviewPanel({
  preview,
  currency,
  isLoading,
  isFetching,
  isStale,
  error,
}: TaxPreviewPanelProps) {
  const components = preview
    ? preview.lines.flatMap((line) => line.components.map((component) => ({ line, component })))
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>What it comes to</CardTitle>
          <CardDescription>
            Worked out by your books every time the draft changes.
          </CardDescription>
        </div>
        {isFetching ? (
          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : error ? (
          <p className="text-label text-destructive" role="alert">
            {getErrorMessage(error)}
          </p>
        ) : !preview ? (
          <p className="text-label text-muted-foreground">
            Save the draft and the totals appear here.
          </p>
        ) : (
          <>
            {isStale ? (
              <p className="text-label text-muted-foreground">
                Showing the last saved version. Save your changes to refresh it.
              </p>
            ) : null}

            <ProblemList problems={preview.errors} tone="danger" />
            <ProblemList problems={preview.warnings} tone="warning" />

            <div className="divide-y divide-border/60">
              <TotalRow label="Before tax" value={formatMinorMoney(preview.netMinor, currency)} />
              {components.map(({ line, component }) => (
                <TotalRow
                  key={`${line.documentLineId}-${component.component}-${component.jurisdiction}`}
                  label={`${component.component} ${formatBasisPoints(component.rateBp)} · ${component.jurisdiction}`}
                  value={formatMinorMoney(component.taxMinor, currency)}
                />
              ))}
              <TotalRow label="Tax" value={formatMinorMoney(preview.taxMinor, currency)} />
              {preview.roundingMinor !== 0 ? (
                <TotalRow
                  label="Rounding"
                  value={formatMinorMoney(preview.roundingMinor, currency)}
                />
              ) : null}
              <TotalRow
                label="Total to pay"
                value={formatMinorMoney(preview.grossMinor, currency)}
                emphasis
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
