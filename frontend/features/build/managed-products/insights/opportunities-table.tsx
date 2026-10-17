"use client";

import { useCallback, useMemo } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import type { DiscoveryListOpportunitiesResponse } from "@/contracts/build-contracts.generated";
import { COMPARE_MAX } from "./compare-drawer";
import { formatStoredRiceScore } from "./rice-formula";

type OpportunityRow = DiscoveryListOpportunitiesResponse["data"][number];
type OpportunitiesListPagination = DiscoveryListOpportunitiesResponse["pagination"];

function ScoreBadge({ row }: { row: OpportunityRow }) {
  if (row.scoreStatus === "unscored") {
    return (
      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
        Unscored
      </span>
    );
  }
  return (
    <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
      {formatStoredRiceScore(row.latestScore?.effectiveScore)}
    </span>
  );
}

interface OpportunitiesTableProps {
  managedProductId: number;
  rows: OpportunityRow[];
  pagination: OpportunitiesListPagination;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isFiltered: boolean;
  filtersSlot?: React.ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  pageNumber: number;
  onRowClick: (row: OpportunityRow) => void;
  selected: ReadonlySet<number>;
  onToggleSelect: (id: number) => void;
  onOpenCompare: () => void;
  onRetry?: () => void;
}

export function OpportunitiesTable({
  rows,
  pagination,
  isLoading,
  isError,
  error,
  isFiltered,
  filtersSlot,
  onNext,
  onPrevious,
  hasPrevious,
  pageNumber,
  onRowClick,
  selected,
  onToggleSelect,
  onOpenCompare,
  onRetry,
}: OpportunitiesTableProps) {
  const columns = useMemo<DataTableColumn<OpportunityRow>[]>(
    () => [
      {
        key: "select",
        header: "",
        width: "w-8",
        cell: (row) => (
          <input
            type="checkbox"
            className="size-4"
            checked={selected.has(row.id)}
            aria-label={`Select ${row.title} for comparison`}
            onChange={() => onToggleSelect(row.id)}
            onClick={(e) => e.stopPropagation()}
            disabled={!selected.has(row.id) && selected.size >= COMPARE_MAX}
          />
        ),
      },
      {
        key: "title",
        header: "Title / problem",
        cell: (row) => (
          <div className="min-w-0 max-w-md overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate" title={row.title}>{row.title}</p>
            {row.problem && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{row.problem}</p>
            )}
          </div>
        ),
      },
      {
        key: "evidence",
        header: "Evidence",
        className: "text-right tabular-nums font-mono",
        cell: (row) => (
          <div className="text-right">
            <span className="font-mono tabular-nums text-sm">{row.evidence.count}</span>
            {row.evidence.latestAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(row.evidence.latestAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "segment",
        header: "Segment",
        cell: (row) => row.affectedSegment ?? <span className="text-muted-foreground text-xs">—</span>,
      },
      {
        key: "state",
        header: "State",
        cell: (row) => (
          <span className="capitalize text-xs">{row.state}</span>
        ),
      },
      {
        key: "score",
        header: "RICE",
        className: "text-right",
        cell: (row) => <ScoreBadge row={row} />,
      },
      {
        key: "outcomeTarget",
        header: "Outcome target",
        cell: (row) =>
          row.outcomeTarget ? (
            <span className="text-xs text-muted-foreground">{row.outcomeTarget}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
    ],
    [selected, onToggleSelect],
  );

  const handleRetry = useCallback(() => onRetry?.(), [onRetry]);

  const toolbar = (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {filtersSlot}
      {selected.size >= 2 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenCompare}
          className="w-fit"
          data-testid="open-compare-btn"
        >
          <GitCompare className="size-3.5" aria-hidden />
          Compare ({selected.size})
        </Button>
      )}
    </div>
  );

  return (
    <BuildListSurface
      permission="build:managed-products:view"
      rows={rows}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      error={error}
      isFiltered={isFiltered}
      toolbar={toolbar}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      onRetry={handleRetry}
      pagination={{
        mode: "cursor",
        pageSize: pagination.limit,
        pageNumber,
        hasMore: pagination.hasMore,
        hasPrevious,
        onNext,
        onPrevious,
      }}
      empty={
        <div data-testid="opportunities-empty">
          <EmptyState
            compact
            illustrationSize="xs"
            title="No opportunities yet"
            description="Capture a customer problem, then score it and link the evidence."
          />
        </div>
      }
      filteredEmpty={
        <div data-testid="opportunities-filtered-empty">
          <EmptyState
            compact
            illustrationSize="xs"
            title="No opportunities match your filters"
            description="Clear a filter to see the rest of the list."
          />
        </div>
      }
      loadingHeaders={["Title / problem", "Evidence", "Segment", "State", "RICE", "Outcome target"]}
    />
  );
}
