"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BulkOnboardResult } from "@/types/hr";

interface BulkOnboardResultPanelProps {
  result: BulkOnboardResult;
  onReset: () => void;
}

export function BulkOnboardResultPanel({ result, onReset }: BulkOnboardResultPanelProps) {
  const failedResults = result.results.filter((r) => !r.success);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="py-8">
        <div className="text-center mb-6">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
              result.created > 0
                ? "bg-status-success-surface"
                : "bg-destructive/10",
            )}
          >
            {result.created > 0 ? (
              <CheckCircle2 className="h-7 w-7 text-status-success-ink" />
            ) : (
              <AlertCircle className="h-7 w-7 text-destructive" />
            )}
          </div>
          <p className="font-semibold text-base">
            {result.created > 0 ? "Bulk onboard complete" : "Onboard finished with errors"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Welcome emails are sent when email delivery is configured.
          </p>
        </div>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-status-success-ink tabular-nums">
              {result.created}
            </p>
            <p className="text-dense text-muted-foreground">Created</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive tabular-nums">{result.failed}</p>
            <p className="text-dense text-muted-foreground">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{result.total}</p>
            <p className="text-dense text-muted-foreground">Total</p>
          </div>
        </div>

        {failedResults.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 mb-4 max-h-48 overflow-auto">
            <p className="text-xs font-medium text-destructive mb-2">Failed rows</p>
            <ul className="space-y-1.5">
              {failedResults.map((r) => (
                <li key={`${r.row}-${r.email}`} className="text-dense text-muted-foreground">
                  <span className="font-medium text-foreground">Row {r.row}</span>
                  {" · "}
                  {r.email}
                  {" — "}
                  {r.error ?? "Unknown error"}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" className="h-8" onClick={onReset}>
            Onboard more
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8" asChild>
            <Link href="/hr/employees">View employees</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
