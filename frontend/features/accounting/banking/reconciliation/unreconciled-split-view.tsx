"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { formatMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUnreconciled } from "@/hooks/api/accounting/banking";

interface UnreconciledSplitViewProps {
  accountId: string;
  asOf: string;
}

export function UnreconciledSplitView({ accountId, asOf }: UnreconciledSplitViewProps) {
  const unreconciledQuery = useUnreconciled({ accountId, asOf, page: 1, pageSize: 100 });

  if (unreconciledQuery.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (unreconciledQuery.isError || !unreconciledQuery.data) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't work out what is still unexplained"
        description={getErrorMessage(unreconciledQuery.error)}
        onRetry={() => void unreconciledQuery.refetch()}
      />
    );
  }

  const view = unreconciledQuery.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-semibold">
            The bank showed it, the books have not recorded it
          </CardTitle>
          <CardDescription className="text-label">
            {formatMoney(view.statementLinesTotalMinor, view.currency)} across{" "}
            {view.statementLines.length} line(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[50vh] overflow-y-auto p-0">
          {view.statementLines.length === 0 ? (
            <EmptyState
              compact
              className="border-0 bg-transparent"
              title="Nothing outstanding"
              description="Every line on the bank statements is accounted for."
            />
          ) : (
            <ul>
              {view.statementLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {line.description ?? "No description on the statement"}
                    </p>
                    <p className="text-dense text-muted-foreground">
                      {formatShortDate(line.valueDate)}
                      {line.bankReference ? ` · ${line.bankReference}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {formatMoney(line.amountMinor, view.currency, { signDisplay: "always" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-semibold">
            The books recorded it, the bank has not shown it
          </CardTitle>
          <CardDescription className="text-label">
            {formatMoney(view.glLinesTotalMinor, view.currency)} across {view.glLines.length}{" "}
            entry(ies)
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[50vh] overflow-y-auto p-0">
          {view.glLines.length === 0 ? (
            <EmptyState
              compact
              className="border-0 bg-transparent"
              title="Nothing outstanding"
              description="Every cash movement in the books has cleared the bank."
            />
          ) : (
            <ul>
              {view.glLines.map((line) => (
                <li
                  key={line.lineId}
                  className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {line.description ?? line.memo ?? line.journalNumber}
                    </p>
                    <p className="text-dense text-muted-foreground">
                      {formatShortDate(line.journalDate)} · {line.journalNumber}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {formatMoney(line.amountMinor, view.currency, { signDisplay: "always" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
