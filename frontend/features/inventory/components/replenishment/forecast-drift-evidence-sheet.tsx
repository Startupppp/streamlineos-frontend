"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/design-tokens";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import { useDriftDetail, type DriftReport } from "@/hooks/api/inventory/replenishment-planning";
import { toneChipClass } from "./transfer-evidence-panel";

const STATUS_TONE: Record<DriftReport["status"], StatusTone> = {
  degrading: "danger",
  improving: "success",
  stable: "info",
  insufficient_data: "neutral",
};

const STATUS_LABEL: Record<DriftReport["status"], string> = {
  degrading: "Degrading",
  improving: "Improving",
  stable: "Stable",
  insufficient_data: "Not enough history",
};

interface ForecastDriftEvidenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productVariantId: number | null;
  productName: string;
  variantSku: string;
  warehouseId: number | null;
}

/**
 * C7 — the evidence behind a drift status.
 *
 * The split-half comparison the service made, and beneath it the stored forecast
 * versions the numbers were read from. Opening this changes nothing: every read
 * here is a GET over rows that already exist, so a degrading forecast still
 * looks degrading after somebody has looked at it.
 */
export function ForecastDriftEvidenceSheet({
  open,
  onOpenChange,
  productVariantId,
  productName,
  variantSku,
  warehouseId,
}: ForecastDriftEvidenceSheetProps) {
  const { data, isLoading, isError, error, refetch } = useDriftDetail(
    productVariantId,
    warehouseId === null ? undefined : { warehouseId },
    { enabled: open },
  );

  function handleRetry(): void {
    void refetch();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">{productName}</SheetTitle>
            <SheetDescription className="text-label text-muted-foreground">
              {variantSku} · forecast accuracy and the versions behind it
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </>
          ) : isError ? (
            <ErrorState
              title="Couldn't load the drift report"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("h-5 px-2 py-0.5 text-xs", toneChipClass(STATUS_TONE[data.report.status]))}
                >
                  {STATUS_LABEL[data.report.status]}
                </Badge>
                {data.report.method && (
                  <Badge variant="outline" className="h-5 px-2 py-0.5 text-xs">
                    {data.report.method}
                  </Badge>
                )}
                {data.report.championChanged && (
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-2 py-0.5 text-xs", toneChipClass("warning"))}
                  >
                    A different method now fits better
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-micro font-medium text-muted-foreground">Earlier half</p>
                  <p className="mt-1 font-mono text-sm tabular-nums">
                    MAE {data.report.earlier ? data.report.earlier.mae : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-micro font-medium text-muted-foreground">Recent half</p>
                  <p className="mt-1 font-mono text-sm tabular-nums">
                    MAE {data.report.recent ? data.report.recent.mae : "—"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">What the comparison found</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {data.report.findings.map((finding) => (
                    <li key={finding} className="text-dense text-muted-foreground">
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold">
                  Stored forecast versions ({data.evidence.totalVersions})
                </h3>
                <p className="mt-1 text-micro text-muted-foreground">
                  The rows the numbers above were read from. Newest first.
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse">
                    <thead>
                      <tr className="border-b border-border/70 text-left">
                        <th className="pb-2 text-micro font-medium text-muted-foreground">Generated</th>
                        <th className="pb-2 text-micro font-medium text-muted-foreground">Method</th>
                        <th className="pb-2 text-right text-micro font-medium text-muted-foreground">MAE</th>
                        <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Periods</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.evidence.versions.map((version) => (
                        <tr key={version.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2 text-dense">
                            {new Date(version.generatedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 text-dense text-muted-foreground">
                            {version.method ?? version.refusalReason ?? "—"}
                          </td>
                          <td className="py-2 text-right font-mono text-dense tabular-nums">
                            {version.metrics ? formatQuantity(version.metrics.mae) : "—"}
                          </td>
                          <td className="py-2 text-right font-mono text-dense tabular-nums text-muted-foreground">
                            {version.periods}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
