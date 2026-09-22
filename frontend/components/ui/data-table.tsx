"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { DataTableFooter } from "@/components/ui/data-table-footer";
import { PAUSED_LABEL, PAUSED_MESSAGE } from "@/components/shared/loading-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DataTableColumn, DataTableProps } from "./data-table.types";
import { createRowActivationKeyHandler, propagationShield } from "@/lib/keyboard-activation";
import { readSortKey, selectionRowLabel } from "./data-table-row";

export type { DataTableColumn, DataTableProps };

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  selection,
  pagination,
  isLoading,
  emptyState,
  footer,
  minWidth,
  className,
  rowClassName,
  search,
  toolbar,
  sortState,
  mobileCard,
}: DataTableProps<T>) {
  const isOnline = useOnlineStatus();
  const [sorting, setSorting] = useState<SortingState>([]);
  const externalSorting: SortingState = sortState?.field
    ? [{ id: sortState.field, desc: sortState.direction === "desc" }]
    : [];
  const serverSortFields = sortState?.fields;
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>({});
  const [internalPage, setInternalPage] = useState(0);

  const tagged = pagination !== undefined && "mode" in pagination ? pagination : undefined;
  const serverPag = tagged?.mode === "server" ? tagged : null;
  const cursorPag = tagged?.mode === "cursor" ? tagged : null;
  const clientPag = tagged === undefined ? pagination : null;
  const isServerPagination = serverPag !== null || cursorPag !== null;
  const clientPageSize = clientPag?.pageSize ?? 50;
  /**
   * Two sorts, never both on one table. With `sortState` the server orders the
   * whole set, and only the keys its endpoint accepts (`sortState.fields`) earn
   * a header control — a header can never ask for an order the API would drop.
   * Without it, a column's own `sortable` reorders the rows, but only while the
   * table holds every row it will show: a server- or cursor-paginated table
   * holds one page, and sorting that page would present a slice as the sorted
   * set.
   */
  const clientSortEnabled = sortState === undefined && !isServerPagination;

  const isRowSelectable = selection?.isRowSelectable;

  const clientPageCount = Math.max(1, Math.ceil(data.length / clientPageSize));
  const clientPage = Math.min(internalPage, clientPageCount - 1);

  const rowSelection = useMemo<RowSelectionState>(() => {
    if (!selection) return localRowSelection;
    return Object.fromEntries([...selection.selected].map((id) => [String(id), true]));
  }, [selection, localRowSelection]);

  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = [];

    if (selection) {
      defs.push({
        id: "__select__",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all rows on this page"
          />
        ),
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label={selectionRowLabel(
                selection.getRowLabel?.(row.original, row.index),
              )}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-not-allowed"
                  onClick={propagationShield.onClick}
                  onKeyDown={propagationShield.onKeyDown}
                >
                  <Checkbox
                    checked={false}
                    disabled
                    aria-label="Owner — transfer ownership first"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>Owner — transfer ownership first</TooltipContent>
            </Tooltip>
          ),
        enableSorting: false,
        meta: { className: "w-8" },
      });
    }

    for (const col of columns) {
      const sortValueFn = col.sortValue;
      const serverSortable = serverSortFields?.includes(col.key) ?? false;
      const clientSortable = clientSortEnabled && (col.sortable ?? false);
      defs.push({
        id: col.key,
        header: col.header,
        // `getCanSort()` ends in `!!column.accessorFn`, so a display column can
        // never be sortable however its flags read. A server-sorted column's
        // value is never used: the rows arrive in the server's order and are
        // rendered in it.
        accessorFn: serverSortable
          ? () => null
          : clientSortable
            ? (row: T) => sortValueFn?.(row) ?? readSortKey(row, col.key)
            : undefined,
        cell: ({ row }) => col.cell(row.original),
        enableSorting: serverSortable || clientSortable,
        sortDescFirst: serverSortable ? false : undefined,
        sortingFn: clientSortable && sortValueFn
          ? (rowA, rowB) => {
              const a = sortValueFn(rowA.original);
              const b = sortValueFn(rowB.original);
              return a < b ? -1 : a > b ? 1 : 0;
            }
          : "auto",
        meta: { className: col.className, headerClassName: col.headerClassName },
      });
    }

    return defs;
  }, [columns, selection, serverSortFields, clientSortEnabled]);

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    getRowId: (row, index) => String(getRowKey(row, index)),
    state: {
      sorting: sortState ? externalSorting : sorting,
      rowSelection,
      pagination: serverPag !== null
        ? { pageIndex: serverPag.page - 1, pageSize: serverPag.pageSize }
        : cursorPag !== null
          ? { pageIndex: 0, pageSize: cursorPag.pageSize }
          : { pageIndex: clientPage, pageSize: clientPageSize },
    },
    manualSorting: !clientSortEnabled,
    // Table-core drops the sort on the third click by default, which leaves no
    // field to send and makes the header look broken.
    enableSortingRemoval: false,
    manualPagination: isServerPagination,
    pageCount: serverPag !== null
      ? Math.ceil(serverPag.total / serverPag.pageSize)
      : cursorPag !== null
        ? -1
        : undefined,
    enableRowSelection: !selection
      ? false
      : isRowSelectable
        ? (row) => isRowSelectable(row.original)
        : true,
    onSortingChange: (updater) => {
      const prev = sortState ? externalSorting : sorting;
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (sortState) {
        const first = next[0];
        if (first) sortState.onChange(first.id, first.desc ? "desc" : "asc");
      } else {
        setSorting(next);
      }
    },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      if (selection) {
        selection.onChange(new Set(Object.keys(next).filter((k) => next[k])));
      } else {
        setLocalRowSelection(next);
      }
    },
    onPaginationChange: (updater) => {
      // A cursor walk is driven by the footer's own next/previous handlers, not
      // by a page index — there is no index to move to.
      if (cursorPag) return;
      if (serverPag) {
        const prev = { pageIndex: serverPag.page - 1, pageSize: serverPag.pageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageIndex !== prev.pageIndex) {
          serverPag.onPageChange(next.pageIndex + 1);
        }
      } else {
        const prev = { pageIndex: clientPage, pageSize: clientPageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        setInternalPage(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: clientSortEnabled ? getSortedRowModel() : undefined,
    getPaginationRowModel: isServerPagination ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;

  /**
   * A row click is a navigation intent 74 call sites over, and the App Router
   * answers it by keeping the current page painted while the next segment
   * resolves — so without a marker here the row looks ignored for exactly as
   * long as the destination takes. `setPendingRowKey` is an urgent update
   * deliberately left OUTSIDE the transition: it commits in the same render
   * pass as the click, so the row is `aria-busy` before the navigation has
   * begun, while `startTransition` keeps the table interactive meanwhile.
   */
  const [isRowPending, startRowTransition] = useTransition();
  const [pendingRowKey, setPendingRowKey] = useState<string | null>(null);

  const handleRowActivate = useCallback(
    (row: T, rowKey: string) => {
      if (!onRowClick) return;
      setPendingRowKey(rowKey);
      startRowTransition(() => {
        onRowClick(row);
      });
    },
    [onRowClick],
  );

  useEffect(() => {
    if (!isRowPending) setPendingRowKey(null);
  }, [isRowPending]);

  const currentPage = serverPag !== null ? serverPag.page - 1 : cursorPag !== null ? 0 : clientPage;
  const totalPages = serverPag !== null
    ? Math.ceil(serverPag.total / serverPag.pageSize)
    : cursorPag !== null
      ? 1
      : table.getPageCount();
  const totalItems = serverPag !== null ? serverPag.total : data.length;
  const pSize = serverPag !== null
    ? serverPag.pageSize
    : cursorPag !== null
      ? cursorPag.pageSize
      : clientPageSize;
  const hasPageSizeControl = !!(
    serverPag?.onPageSizeChange ?? cursorPag?.onPageSizeChange ?? clientPag?.onPageSizeChange
  );
  /**
   * A keyset page cannot say how many rows exist, so `aria-rowcount` is -1 —
   * the ARIA value for "total unknown" — and the footer shows only what this
   * page holds. Reporting `data.length` as the total would tell a screen
   * reader the table ends here.
   */
  // An empty page reached by Next still owes the reader a way back.
  const showPagination = cursorPag !== null
    ? (data.length > 0 || cursorPag.hasPrevious) &&
      (cursorPag.hasMore || cursorPag.hasPrevious || hasPageSizeControl)
    : totalItems > 0 && (totalPages > 1 || hasPageSizeControl);
  const ariaRowCount = cursorPag !== null ? -1 : totalItems + 1;
  const firstRowNumber = currentPage * pSize + 1;

  function handleSearchChange(value: string) {
    search?.onChange(value);
  }

  function handlePageChange(nextPage: number) {
    if (serverPag) serverPag.onPageChange(nextPage);
    else setInternalPage(nextPage - 1);
  }

  return (
    <div className={cn("rounded-md border border-border bg-card flex flex-col min-w-0", className)}>
      {(search !== undefined || toolbar !== undefined) && (
        <div className="shrink-0 flex flex-col gap-2 border-b border-border bg-muted/50 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          {search !== undefined ? (
            <SearchInput
              value={search.value}
              onValueChange={handleSearchChange}
              placeholder={search.placeholder ?? "Search…"}
              aria-label={search.placeholder ?? "Search"} className="min-w-0"
            />
          ) : (
            <div className="hidden sm:block" />
          )}
          {toolbar ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
              {toolbar}
            </div>
          ) : null}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto overscroll-x-contain flex flex-col [-webkit-overflow-scrolling:touch]">
        {isLoading ? (
          <div aria-busy={isOnline}>
            <span role="status" className="sr-only">
              {isOnline ? "Loading results…" : PAUSED_LABEL}
            </span>
            {!isOnline && (
              <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                {PAUSED_MESSAGE}
              </p>
            )}
            {mobileCard ? (
              <div className="sm:hidden flex flex-col gap-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : null}
            <div
              style={minWidth && minWidth !== "auto" ? { minWidth } : undefined}
              className={cn(
                (!minWidth || minWidth === "content") && "min-w-max",
                mobileCard && "hidden sm:block",
              )}
            >
              <Table containerClassName="overflow-visible">
                <DataTableHeader table={table} announceSort={false} rowIndex={1} />
                <TableBody>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <TableRow key={i} className="h-10 hover:bg-transparent">
                      {columnDefs.map((_, j) => (
                        <TableCell key={j} className="px-2 py-2 text-sm">
                          <Skeleton className="h-3.5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div
            role={emptyState ? undefined : "status"}
            className="flex flex-1 min-h-0 h-full flex-col justify-center p-2 [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none"
          >
            {emptyState ?? (
              <ChartEmptyState message="No results found." height={260} />
            )}
          </div>
        ) : (
          <>
          {mobileCard ? (
            <div className="sm:hidden flex flex-col gap-2 p-2">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-busy={pendingRowKey === row.id ? true : undefined}
                  data-pending={pendingRowKey === row.id ? "true" : undefined}
                  onClick={onRowClick ? () => handleRowActivate(row.original, row.id) : undefined}
                  onKeyDown={
                    onRowClick
                      ? createRowActivationKeyHandler(() => handleRowActivate(row.original, row.id))
                      : undefined
                  }
                  className={cn(
                    "rounded-lg border border-border bg-card p-3 text-left touch-manipulation",
                    onRowClick && "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "data-[pending=true]:animate-pulse data-[pending=true]:bg-muted",
                    rowClassName?.(row.original, index),
                  )}
                >
                  {mobileCard(row.original, index)}
                </div>
              ))}
            </div>
          ) : null}
          <div
            style={minWidth && minWidth !== "auto" ? { minWidth } : undefined}
            className={cn(
              (!minWidth || minWidth === "content") && "min-w-max",
              mobileCard && "hidden sm:block",
            )}
          >
            <Table
              containerClassName="overflow-visible"
              aria-rowcount={ariaRowCount}
            >
              <DataTableHeader table={table} announceSort rowIndex={1} />
              <TableBody>
                {rows.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    aria-rowindex={firstRowNumber + rowIndex + 1}
                    className={cn(
                      "h-10 hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      "data-[pending=true]:animate-pulse data-[pending=true]:bg-muted",
                      rowClassName?.(row.original, rowIndex),
                    )}
                    aria-busy={pendingRowKey === row.id ? true : undefined}
                    data-pending={pendingRowKey === row.id ? "true" : undefined}
                    onClick={onRowClick ? () => handleRowActivate(row.original, row.id) : undefined}
                    onKeyDown={
                      onRowClick
                        ? createRowActivationKeyHandler(() => handleRowActivate(row.original, row.id))
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-2 py-2 text-sm",
                          cell.column.columnDef.meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </div>

      {footer !== undefined && (
        <div className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
          {footer}
        </div>
      )}

      {showPagination && (
        <DataTableFooter
          cursor={cursorPag}
          page={currentPage + 1}
          totalPages={totalPages}
          total={totalItems}
          limit={pSize}
          rowCount={data.length}
          onPageChange={handlePageChange}
          onLimitChange={serverPag?.onPageSizeChange ?? clientPag?.onPageSizeChange}
          pageSizeOptions={serverPag?.pageSizeOptions}
        />
      )}
    </div>
  );
}

export { DataTableSkeleton } from "./data-table-skeleton";
