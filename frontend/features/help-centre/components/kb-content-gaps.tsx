"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { ErrorReference } from "@/components/shared/error-reference";
import { Button } from "@/components/ui/button";
import { useKbContentGaps } from "@/hooks/api/kb/analytics";
import { isApiError } from "@/lib/api-envelope";
import type { KbAnalyticsRange, KbContentGapRow } from "@/types/kb";

interface KbContentGapsProps {
  range?: KbAnalyticsRange;
  filter?: "all" | "search" | "ai_no_context";
}

function GapKindBadge({ kind }: { kind: KbContentGapRow["gapKind"] }) {
  if (kind === "ai_no_context") {
    return (
      <Badge variant="outline" className="text-micro h-5 bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
        AI no-context
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-micro h-5 bg-status-info-surface text-status-info-ink border-status-info-rule">
      Search
    </Badge>
  );
}

function GapRow({ row }: { row: KbContentGapRow }) {
  const formattedDate = useMemo(() => {
    try {
      return format(new Date(row.lastOccurredAt), "MMM d, yyyy");
    } catch {
      return "—";
    }
  }, [row.lastOccurredAt]);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card text-sm hover:bg-muted/30 transition-colors">
      <GapKindBadge kind={row.gapKind} />
      <span className="flex-1 min-w-0 truncate text-label">
        {row.query ?? <span className="text-muted-foreground italic">Unknown query</span>}
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums">{row.count}×</span>
      <span className="shrink-0 text-dense text-muted-foreground w-[90px] text-right">{formattedDate}</span>
    </div>
  );
}

export function KbContentGaps({ range, filter = "all" }: KbContentGapsProps) {
  const {
    data,
    isLoading,
    isFetchNextPageError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useKbContentGaps(range, filter === "all" ? undefined : filter);
  const rows = data ?? [];
  const accessLost = isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404);

  function handleRetry() {
    void refetch();
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  if (isLoading) return <LoadingState variant="list" rows={6} />;
  if (error && (rows.length === 0 || accessLost)) {
    return (
      <ErrorState
        description={getErrorMessage(error)}
        error={error}
        onRetry={handleRetry}
        compact
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No content gaps"
        description="All searches and AI queries are returning results."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 px-3 py-1.5 text-micro font-medium uppercase tracking-wide text-muted-foreground">
        <span className="w-[90px] shrink-0">Kind</span>
        <span className="flex-1">Query</span>
        <span className="shrink-0">Count</span>
        <span className="shrink-0 w-[90px] text-right">Last seen</span>
      </div>
      {rows.map((row, idx) => (
        <GapRow key={`${row.gapKind}-${row.query ?? "null"}-${idx}`} row={row} />
      ))}
      {error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{isFetchNextPageError ? "Could not load more content gaps." : "Could not refresh content gaps."} {getErrorMessage(error)}</p>
          <ErrorReference error={error} />
          <Button type="button" variant="outline" onClick={isFetchNextPageError ? handleLoadMore : handleRetry} disabled={isFetchingNextPage}>
            {isFetchNextPageError ? "Retry loading content gaps" : "Retry refreshing content gaps"}
          </Button>
        </div>
      )}
      {hasNextPage && !error ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading content gaps..." : "Load more content gaps"}
        </Button>
      ) : null}
    </div>
  );
}
