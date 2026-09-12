"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { StatementLine } from "@/types/accounting-banking";

interface StatementLinesPanelProps {
  lines: StatementLine[];
  currency: string;
  unmatchedIds: ReadonlySet<string>;
  selectedLineId: string | null;
  isLoading: boolean;
  isUnmatching: boolean;
  canReconcile: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelectLine: (lineId: string) => void;
  onUnmatch: (lineId: string) => void;
}

export function StatementLinesPanel({
  lines,
  currency,
  unmatchedIds,
  selectedLineId,
  isLoading,
  isUnmatching,
  canReconcile,
  page,
  pageSize,
  total,
  onPageChange,
  onSelectLine,
  onUnmatch,
}: StatementLinesPanelProps) {
  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 px-4 py-3">
        <CardTitle className="text-sm font-semibold">What the bank showed</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : lines.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent min-h-[30vh]"
            title="No lines on this statement"
            description="Bring in a statement with transactions on it to start matching."
          />
        ) : (
          <ul className="flex-1 min-h-0 overflow-y-auto">
            {lines.map((line) => {
              const isMatched = !unmatchedIds.has(line.id);
              const isSelected = selectedLineId === line.id;
              return (
                <li
                  key={line.id}
                  className={cn(
                    "border-b border-border/60 px-4 py-3 transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectLine(line.id)}
                    >
                      <p className="truncate text-sm font-medium">
                        {line.description ?? "No description on the statement"}
                      </p>
                      <p className="truncate text-dense text-muted-foreground">
                        {formatShortDate(line.valueDate)}
                        {line.bankReference ? ` · ${line.bankReference}` : ""}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-sm tabular-nums">
                        {formatMinorMoney(line.amountMinor, currency, { signDisplay: "always" })}
                      </span>
                      {isMatched ? (
                        <div className="flex items-center gap-1">
                          <SemanticBadge tone="success" size="xs" label="Matched" />
                          {canReconcile ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-dense"
                              disabled={isUnmatching}
                              onClick={() => onUnmatch(line.id)}
                            >
                              Undo
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <SemanticBadge tone="warning" size="xs" label="Not explained" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}
