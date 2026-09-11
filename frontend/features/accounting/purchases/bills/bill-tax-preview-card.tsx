"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatBasisPoints, formatMoney } from "@/lib/accounting/money";
import { getErrorMessage } from "@/lib/get-error-message";
import { useApDocumentTaxPreview } from "@/hooks/api/accounting/ap";
import { TAX_CATEGORY_LABELS } from "../lib/ap-labels";

interface BillTaxPreviewCardProps {
  apDocumentId: string;
  lineDescriptions: Readonly<Record<string, string>>;
}

const dangerTone = statusToneClasses("danger");
const warningTone = statusToneClasses("warning");
const infoTone = statusToneClasses("info");

function NoticeRow({
  tone,
  icon,
  message,
}: {
  tone: "danger" | "warning" | "info";
  icon: ReactNode;
  message: string;
}) {
  const classes =
    tone === "danger" ? dangerTone : tone === "warning" ? warningTone : infoTone;
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
        classes.surface,
        classes.ink,
        classes.rule,
      )}
    >
      {icon}
      <span>{message}</span>
    </li>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function BillTaxPreviewCard({ apDocumentId, lineDescriptions }: BillTaxPreviewCardProps) {
  const previewQuery = useApDocumentTaxPreview(apDocumentId);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">What the tax works out to</CardTitle>
            <CardDescription className="text-label">
              Worked out by the books from the lines as they are saved.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void previewQuery.refetch()}
          >
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {previewQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : previewQuery.isError ? (
          <ErrorState
            compact
            title="Couldn't work out the tax"
            description={getErrorMessage(previewQuery.error)}
            onRetry={() => void previewQuery.refetch()}
          />
        ) : previewQuery.data ? (
          <div className="space-y-3">
            <div>
              <AmountRow
                label="Before tax"
                value={formatMoney(previewQuery.data.netMinor, previewQuery.data.currency)}
              />
              <AmountRow
                label="Tax the vendor charges"
                value={formatMoney(previewQuery.data.taxMinor, previewQuery.data.currency)}
              />
              {previewQuery.data.selfAssessedTaxMinor !== 0 ? (
                <AmountRow
                  label="Tax you account for yourself"
                  value={formatMoney(
                    previewQuery.data.selfAssessedTaxMinor,
                    previewQuery.data.currency,
                  )}
                />
              ) : null}
              {previewQuery.data.blockedTaxMinor !== 0 ? (
                <AmountRow
                  label="Tax you cannot reclaim"
                  value={formatMoney(previewQuery.data.blockedTaxMinor, previewQuery.data.currency)}
                />
              ) : null}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
                <span className="text-sm font-medium">Total to pay</span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(previewQuery.data.grossMinor, previewQuery.data.currency)}
                </span>
              </div>
            </div>

            {previewQuery.data.errors.length > 0 || previewQuery.data.warnings.length > 0 ? (
              <ul className="space-y-2">
                {previewQuery.data.errors.map((notice) => (
                  <NoticeRow
                    key={`error-${notice.code}-${notice.documentLineId ?? "bill"}`}
                    tone="danger"
                    icon={<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    message={notice.message}
                  />
                ))}
                {previewQuery.data.warnings.map((notice) => (
                  <NoticeRow
                    key={`warning-${notice.code}-${notice.documentLineId ?? "bill"}`}
                    tone="warning"
                    icon={<Info className="mt-0.5 h-4 w-4 shrink-0" />}
                    message={notice.message}
                  />
                ))}
              </ul>
            ) : null}

            {previewQuery.data.lines.length > 0 ? (
              <ul className="space-y-2">
                {previewQuery.data.lines.map((line) => (
                  <li
                    key={line.documentLineId}
                    className="rounded-md border border-border/70 bg-muted/30 px-3 py-2"
                  >
                    <p className="truncate text-label font-medium">
                      {lineDescriptions[line.documentLineId] ?? TAX_CATEGORY_LABELS[line.category]}
                    </p>
                    <p className="text-dense text-muted-foreground">
                      {TAX_CATEGORY_LABELS[line.category]} ·{" "}
                      {formatMoney(line.totalTaxMinor, previewQuery.data.currency)} on{" "}
                      {formatMoney(line.taxableMinor, previewQuery.data.currency)}
                    </p>
                    {line.components.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {line.components.map((component) => (
                          <li
                            key={`${line.documentLineId}-${component.component}-${component.jurisdiction}`}
                            className="flex items-center justify-between gap-2 text-dense text-muted-foreground"
                          >
                            <span className="truncate">
                              {component.component} at {formatBasisPoints(component.rateBp)}
                              {component.recoverable ? "" : " · not reclaimable"}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatMoney(component.taxMinor, previewQuery.data.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
