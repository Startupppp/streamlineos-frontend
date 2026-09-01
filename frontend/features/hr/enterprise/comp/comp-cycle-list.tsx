"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCompCycles, type CompCycle } from "@/hooks/api/hr/enterprise-comp";

interface Props {
  onSelect: (cycle: CompCycle) => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  active: "default",
  calibrating: "outline",
  approved: "default",
  closed: "secondary",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function CompCycleList({ onSelect }: Props) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data, isLoading, isFetching } = useCompCycles({ cursor });
  const cycles = data?.data ?? [];

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (!cycles.length) {
    return (
      <EmptyState
        illustrationPreset="default"
        title="No compensation cycles"
        description="Create an annual increment cycle to start the compensation planning process"
        compact
        className="h-64 border-0 shadow-none"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="space-y-3">
        {cycles.map((cycle, idx) => (
        <motion.div
          key={cycle.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelect(cycle)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(cycle);
            }
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <TruncatedText text={cycle.name} className="font-semibold text-sm min-w-0 flex-1" />
              <Badge variant={STATUS_VARIANT[cycle.status]} className="capitalize text-dense shrink-0">{cycle.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">FY {cycle.fiscalYear} · Budget {formatCents(cycle.budgetPoolCents)}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </motion.div>
        ))}
      </div>
      {data && (page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      ) : null}
    </div>
  );
}
