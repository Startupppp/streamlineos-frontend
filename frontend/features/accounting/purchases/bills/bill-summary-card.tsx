"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { ApDocumentDetail } from "@/types/accounting/accounting-ap";
import {
  AP_STATUS_LABELS,
  AP_STATUS_TONES,
  BLOCKED_INPUT_TAX_EXPLAINER,
  REVERSE_CHARGE_EXPLAINER,
} from "../lib/ap-labels";
import { FlagExplainer } from "./bill-document-flags";

interface BillSummaryCardProps {
  document: ApDocumentDetail;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function BillSummaryCard({ document }: BillSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            What this bill comes to
          </CardTitle>
          <SemanticBadge
            tone={AP_STATUS_TONES[document.status]}
            label={AP_STATUS_LABELS[document.status]}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div>
          <Row
            label="Before tax"
            value={formatMinorMoney(document.netMinor, document.currency)}
          />
          <Row
            label="Tax"
            value={formatMinorMoney(document.taxMinor, document.currency)}
          />
          {document.roundingMinor !== 0 ? (
            <Row
              label="Rounding"
              value={formatMinorMoney(
                document.roundingMinor,
                document.currency,
              )}
            />
          ) : null}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
            <span className="text-sm font-medium">Bill total</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatMinorMoney(document.grossMinor, document.currency)}
            </span>
          </div>
          <Row
            label="Paid so far"
            value={formatMinorMoney(document.settledMinor, document.currency)}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Still owed</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatMinorMoney(document.openMinor, document.currency)}
            </span>
          </div>
        </div>

        <div className="space-y-1 border-t border-border pt-2">
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-label text-muted-foreground">
              Their bill number
            </span>
            <span className="text-sm">
              {document.vendorDocumentNumber ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-label text-muted-foreground">Dated</span>
            <span className="text-sm tabular-nums">
              {document.vendorDocumentDate
                ? formatShortDate(document.vendorDocumentDate)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-label text-muted-foreground">Pay by</span>
            <span className="text-sm tabular-nums">
              {document.dueDate ? formatShortDate(document.dueDate) : "—"}
            </span>
          </div>
        </div>

        {document.reverseCharge ? (
          <FlagExplainer text={REVERSE_CHARGE_EXPLAINER} />
        ) : null}
        {document.blockedInputTax ? (
          <FlagExplainer text={BLOCKED_INPUT_TAX_EXPLAINER} />
        ) : null}
      </CardContent>
    </Card>
  );
}
