"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { StatementImportResult } from "@/types/accounting-banking";

interface ImportResultPanelProps {
  result: StatementImportResult;
  onImportAnother: () => void;
}

const successTone = statusToneClasses("success");
const warningTone = statusToneClasses("warning");

export function ImportResultPanel({ result, onImportAnother }: ImportResultPanelProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">The statement is in</CardTitle>
        <CardDescription className="text-label">
          {formatShortDate(result.periodStart)} to {formatShortDate(result.periodEnd)} ·{" "}
          {result.lineCount} line(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
            successTone.surface,
            successTone.ink,
            successTone.rule,
          )}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Opened at {formatMoney(result.openingMinor, result.currency)}, closed at{" "}
            {formatMoney(result.closingMinor, result.currency)}, a movement of{" "}
            {formatMoney(result.movementMinor, result.currency)}.
          </span>
        </div>

        {result.warnings.length > 0 ? (
          <ul className="space-y-2">
            {result.warnings.map((warning) => (
              <li
                key={`${warning.code}-${warning.message}`}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
                  warningTone.surface,
                  warningTone.ink,
                  warningTone.rule,
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onImportAnother}>
            Bring in another
          </Button>
          <Button asChild>
            <Link
              href={`/accounting/banking/reconciliation?statementId=${result.statementId}`}
            >
              Check it against the books
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
