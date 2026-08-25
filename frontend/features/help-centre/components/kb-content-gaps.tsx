"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { useKbContentGaps } from "@/hooks/api/kb/analytics";
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
  const { data, isLoading, error, refetch } = useKbContentGaps(range);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((r) => r.gapKind === filter);
  }, [data, filter]);

  function handleRetry() {
    void refetch();
  }

  if (isLoading) return <LoadingState variant="list" rows={6} />;
  if (error) {
    return (
      <ErrorState
        description={getErrorMessage(error)}
        onRetry={handleRetry}
        compact
      />
    );
  }
  if (filtered.length === 0) {
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
      {filtered.map((row, idx) => (
        <GapRow key={`${row.gapKind}-${row.query ?? "null"}-${idx}`} row={row} />
      ))}
    </div>
  );
}
