"use client";

import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useMatchStatementLine,
  useMatchSuggestions,
} from "@/hooks/api/accounting/banking";
import type { MatchKind } from "@/types/accounting/accounting-banking";

interface MatchSuggestionsPanelProps {
  statementLineId: string | null;
  canReconcile: boolean;
}

const KIND_LABELS: Readonly<Record<MatchKind, string>> = {
  receipt: "Money a customer paid us",
  payment: "Money we paid out",
  journal: "A manual entry in the books",
};

export function MatchSuggestionsPanel({
  statementLineId,
  canReconcile,
}: MatchSuggestionsPanelProps) {
  const suggestionsQuery = useMatchSuggestions(statementLineId ?? "", {
    limit: 10,
  });
  const matchLine = useMatchStatementLine();

  function handleMatch(kind: MatchKind, id: string): void {
    if (!statementLineId) return;
    matchLine.mutate(
      { statementLineId, kind, id },
      {
        onSuccess: () => toast.success("Matched to the books"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 px-4 py-3">
        <CardTitle className="text-sm font-semibold">
          What it might be in the books
        </CardTitle>
        <CardDescription className="text-label">
          Entries within three days of the bank&apos;s date, for the same
          amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 pt-0">
        {!statementLineId ? (
          <EmptyState
            className="border-0 bg-transparent min-h-[30vh]"
            title="Pick a line from the bank"
            description="Choose a statement line on the left and we will look for what it is in the books."
          />
        ) : suggestionsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : suggestionsQuery.isError ? (
          <ErrorState
            compact
            title="Couldn't look for matches"
            description={getErrorMessage(suggestionsQuery.error)}
            onRetry={() => void suggestionsQuery.refetch()}
          />
        ) : (suggestionsQuery.data?.suggestions.length ?? 0) === 0 ? (
          <EmptyState
            className="border-0 bg-transparent min-h-[30vh]"
            title="Nothing in the books looks like this"
            description="The bank moved money the books have not recorded. Enter it as a bill, a receipt or a journal, then come back."
          />
        ) : (
          <ul className="space-y-2">
            {(suggestionsQuery.data?.suggestions ?? []).map((suggestion) => (
              <li
                key={`${suggestion.kind}-${suggestion.id}`}
                className="rounded-md border border-border/70 bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {suggestion.label}
                    </p>
                    <p className="truncate text-dense text-muted-foreground">
                      {KIND_LABELS[suggestion.kind]} ·{" "}
                      {formatShortDate(suggestion.date)}
                      {suggestion.reference ? ` · ${suggestion.reference}` : ""}
                    </p>
                    {suggestion.reasons.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {suggestion.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="text-dense text-muted-foreground"
                          >
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm tabular-nums">
                      {formatMinorMoney(
                        suggestion.amountMinor,
                        suggestion.currency,
                        {
                          signDisplay: "always",
                        },
                      )}
                    </span>
                    <LoadingButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-dense"
                      disabled={!canReconcile}
                      isPending={matchLine.isPending}
                      onClick={() =>
                        handleMatch(suggestion.kind, suggestion.id)
                      }
                    >
                      That&apos;s it
                    </LoadingButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
