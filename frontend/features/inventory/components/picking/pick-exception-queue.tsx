"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import type {
  PickExceptionOwnership,
  PickExceptionStatus,
} from "@/hooks/api/inventory/picking";
import {
  usePickExceptions,
  type PickExceptionSummary,
} from "@/hooks/api/inventory/pick-exceptions";
import {
  PICK_EXCEPTION_BADGE,
  PICK_EXCEPTION_BLOCKING_BADGE,
  PICK_EXCEPTION_LABEL,
  PICK_EXCEPTION_RESOLUTION_LABEL,
  PICK_EXCEPTION_STATUS_BADGE,
  PICK_EXCEPTION_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";
import { ResolveExceptionDialog } from "./resolve-exception-dialog";

interface PickExceptionQueueProps {
  status: PickExceptionStatus | undefined;
  ownership: PickExceptionOwnership;
}

/**
 * B5, item 5 — the supervisor queue.
 *
 * The column that earns its place is "Holding": a list of exceptions is a report,
 * but a list that says which of them is keeping a picker standing still is a
 * queue somebody works top to bottom. It comes from the server, computed from the
 * same expression the wave uses to decide whether it is finished, so the two can
 * never disagree about which row is the blocker.
 */
export function PickExceptionQueue({ status, ownership }: PickExceptionQueueProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [reviewing, setReviewing] = useState<PickExceptionSummary | null>(null);

  const exceptions = usePickExceptions({ page, limit: pageSize, status, ownership });

  function handleRetry(): void {
    void exceptions.refetch();
  }

  function handleReviewOpenChange(open: boolean): void {
    if (!open) setReviewing(null);
  }

  const columns: DataTableColumn<PickExceptionSummary>[] = [
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("h-4 px-1.5 py-0 text-micro", PICK_EXCEPTION_BADGE[row.reason])}
        >
          {PICK_EXCEPTION_LABEL[row.reason]}
        </Badge>
      ),
    },
    {
      key: "sku",
      header: "Item",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-dense tabular-nums">{row.sku}</p>
          <p className="truncate text-micro text-muted-foreground">
            {row.substituteSku ? `Swapped for ${row.substituteSku}` : row.variantName}
          </p>
        </div>
      ),
    },
    {
      key: "pickNumber",
      header: "Wave",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-dense tabular-nums">{row.pickNumber}</p>
          {row.soNumber ? (
            <p className="truncate font-mono text-micro text-muted-foreground">
              {row.soNumber}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Picked",
      cell: (row) => (
        <span className="font-mono tabular-nums">
          {Number(row.quantityPicked).toFixed(2)} / {Number(row.quantityToPick).toFixed(2)}
        </span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "ownerName",
      header: "Owner",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.ownerName ?? "Unassigned"}</span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "blocksWave",
      header: "Holding",
      cell: (row) =>
        row.blocksWave ? (
          <Badge
            variant="outline"
            className={cn("h-4 px-1.5 py-0 text-micro", PICK_EXCEPTION_BLOCKING_BADGE)}
          >
            Wave waiting
          </Badge>
        ) : (
          <span className="text-micro text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("h-4 px-1.5 py-0 text-micro", PICK_EXCEPTION_STATUS_BADGE[row.status])}
        >
          {row.resolution
            ? PICK_EXCEPTION_RESOLUTION_LABEL[row.resolution]
            : PICK_EXCEPTION_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "reportedAt",
      header: "Raised",
      cell: (row) => (
        <span className="font-mono tabular-nums">
          {row.reportedAt ? formatShortDate(row.reportedAt) : "—"}
        </span>
      ),
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.status === "OPEN" ? (
          <ReviewButton exception={row} onReview={setReviewing} />
        ) : null,
      className: "w-24 text-right",
      headerClassName: "w-24",
    },
  ];

  if (exceptions.isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load the exception queue"
        description={getErrorMessage(exceptions.error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <DataTable
        data={exceptions.data?.items ?? []}
        columns={columns}
        getRowKey={(row) => row.pickLineId}
        isLoading={exceptions.isLoading}
        className="flex-1 min-h-0"
        minWidth="1100px"
        mobileCard={(row) => (
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-sm tabular-nums">{row.sku}</span>
              <Badge
                variant="outline"
                className={cn("h-5 px-2 py-0.5 text-micro", PICK_EXCEPTION_BADGE[row.reason])}
              >
                {PICK_EXCEPTION_LABEL[row.reason]}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {row.pickNumber} · {row.ownerName ?? "Unassigned"}
              </span>
              <span className="shrink-0 font-mono tabular-nums">
                {Number(row.quantityPicked).toFixed(2)} /{" "}
                {Number(row.quantityToPick).toFixed(2)}
              </span>
            </div>
            {row.status === "OPEN" ? (
              <ReviewButton exception={row} onReview={setReviewing} />
            ) : null}
          </div>
        )}
        emptyState={
          <InventoryEmptyState
            illustration={<EmptyOrdersIllustration />}
            title={status === "OPEN" ? "Nothing waiting on you" : "No exceptions here"}
            description={
              ownership === "MINE"
                ? "Exceptions land here when a picker cannot close a line the way the wave asked."
                : "When a picker reports a shortfall, a damaged unit or a swap, it arrives here with an owner."
            }
            compact
          />
        }
        pagination={{
          mode: "server",
          page,
          pageSize,
          total: exceptions.data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      <ResolveExceptionDialog
        open={reviewing !== null}
        onOpenChange={handleReviewOpenChange}
        exception={reviewing}
      />
    </>
  );
}

interface ReviewButtonProps {
  exception: PickExceptionSummary;
  onReview: (exception: PickExceptionSummary) => void;
}

/**
 * Extracted rather than inlined because a `DataTable` cell callback is not a
 * component: hooks cannot run in one, and a closure over the row is the only way
 * a named handler can reach it.
 */
function ReviewButton({ exception, onReview }: ReviewButtonProps) {
  function handleClick(): void {
    onReview(exception);
  }
  return (
    <Button variant="outline" size="sm" className="h-7 w-full sm:w-auto" onClick={handleClick}>
      Review
    </Button>
  );
}
