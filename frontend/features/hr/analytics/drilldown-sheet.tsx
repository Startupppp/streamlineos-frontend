"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useHrDrilldown } from "@/hooks/api/hr/analytics";

interface DrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  metric: string;
  title: string;
  departmentId?: number;
}

type DrilldownRow = Record<string, unknown> & { _rowIdx: number };

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatColumnLabel(col: string): string {
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function getRowKey(row: DrilldownRow): number {
  return row._rowIdx;
}

export function DrilldownSheet({ open, onClose, metric, title, departmentId }: DrilldownSheetProps) {
  const access = useCanState("hr:analytics:read");
  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useHrDrilldown(metric, departmentId);

  const rows = data?.pages?.flatMap((p) => p.rows) ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  const indexedRows: DrilldownRow[] = rows.map((row, i) => ({ ...row, _rowIdx: i }));

  const tableColumns: DataTableColumn<DrilldownRow>[] = columns.map((col) => ({
    key: col,
    header: formatColumnLabel(col),
    cell: (row) => formatCellValue(row[col]),
  }));

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  function handleRetry() {
    void refetch();
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  const pending = isPending || access === "loading";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{title} — Details</SheetTitle>
          <SheetDescription className="sr-only">Detailed employee records for the selected analytics metric.</SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-4">
          {access === "denied" ? (
            <NoPermissionState permission="hr:analytics:read" compact />
          ) : isError ? (
            <ErrorState
              compact
              title="Couldn't load these details"
              description={getErrorMessage(error)}
              error={error}
              onRetry={handleRetry}
            />
          ) : (
            <>
              <DataTable
                data={indexedRows}
                columns={tableColumns}
                getRowKey={getRowKey}
                isLoading={pending}
                emptyState={
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                }
              />
              <InfiniteScrollSentinel
                hasNextPage={hasNextPage ?? false}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                label="Load more rows"
              />
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
