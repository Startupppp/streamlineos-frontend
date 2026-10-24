"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
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
import {
  PAUSED_LABEL,
  PAUSED_MESSAGE,
} from "@/components/shared/loading-state";
import { StalledReadNotice } from "@/components/shared/stalled-read-notice";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  PANEL_STALLED_AFTER_MS,
  useStalledAfter,
} from "@/hooks/common/use-stalled-after";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DataTableColumn, DataTableProps } from "./data-table.types";
import {
  createRowActivationKeyHandler,
  propagationShield,
} from "@/lib/keyboard-activation";
import {
  MOBILE_CARD_BREAKPOINT,
  readSortKey,
  selectionRowLabel,
} from "./data-table-row";

export type { DataTableColumn, DataTableProps };

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  onRowContextMenu,
  selection,
  pagination,
  isLoading,
  onStalledRetry,
  emptyState,
  footer,
  minWidth,
  className,
  fillHeight = true,
  stickyHeaderTop,
  scrollRegionLabel,
  rowClassName,
  search,
  toolbar,
  sortState,
  mobileCard,
  mobileCardBreakpoint = "sm",
}: DataTableProps<T>) {
  const isOnline = useOnlineStatus();
  const loadingStalled = useStalledAfter(
    !!isLoading && isOnline && !!onStalledRetry,
    PANEL_STALLED_AFTER_MS,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const externalSorting: SortingState = sortState?.field
    ? [{ id: sortState.field, desc: sortState.direction === "desc" }]
    : [];
  const serverSortFields = sortState?.fields;
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>(
    {},
  );
  const [internalPage, setInternalPage] = useState(0);

  const tagged =
    pagination !== undefined && "mode" in pagination ? pagination : undefined;
  const serverPag = tagged?.mode === "server" ? tagged : null;
  const cursorPag = tagged?.mode === "cursor" ? tagged : null;
  const clientPag = tagged === undefined ? pagination : null;
  const isServerPagination = serverPag !== null || cursorPag !== null;
  const clientPageSize = clientPag?.pageSize ?? 50;
  const clientSortEnabled = sortState === undefined && !isServerPagination;

  const isRowSelectable = selection?.isRowSelectable;

  const clientPageCount = Math.max(1, Math.ceil(data.length / clientPageSize));
  const clientPage = Math.min(internalPage, clientPageCount - 1);

  const rowSelection = useMemo<RowSelectionState>(() => {
    if (!selection) return localRowSelection;
    return Object.fromEntries(
      [...selection.selected].map((id) => [String(id), true]),
    );
  }, [selection, localRowSelection]);

  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = [];

    if (selection) {
      const activeSelection = selection;
      defs.push({
        id: "__select__",
        header: () => null,
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label={selectionRowLabel(
                activeSelection.getRowLabel?.(row.original, row.index),
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
        accessorFn: serverSortable
          ? () => null
          : clientSortable
            ? (row: T) => sortValueFn?.(row) ?? readSortKey(row, col.key)
            : undefined,
        cell: ({ row }) => col.cell(row.original),
        enableSorting: serverSortable || clientSortable,
        sortDescFirst: serverSortable ? false : undefined,
        sortingFn:
          clientSortable && sortValueFn
            ? (rowA, rowB) => {
                const a = sortValueFn(rowA.original);
                const b = sortValueFn(rowB.original);
                return a < b ? -1 : a > b ? 1 : 0;
              }
            : "auto",
        meta: {
          className: col.className,
          headerClassName: col.headerClassName,
        },
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
      pagination:
        serverPag !== null
          ? { pageIndex: serverPag.page - 1, pageSize: serverPag.pageSize }
          : cursorPag !== null
            ? { pageIndex: 0, pageSize: cursorPag.pageSize }
            : { pageIndex: clientPage, pageSize: clientPageSize },
    },
    manualSorting: !clientSortEnabled,
    enableSortingRemoval: false,
    manualPagination: isServerPagination,
    pageCount:
      serverPag !== null
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
      if (selection)
        selection.onChange(new Set(Object.keys(next).filter((k) => next[k])));
      else setLocalRowSelection(next);
    },
    onPaginationChange: (updater) => {
      if (cursorPag) return;
      if (serverPag) {
        const prev = {
          pageIndex: serverPag.page - 1,
          pageSize: serverPag.pageSize,
        };
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
    getPaginationRowModel: isServerPagination
      ? undefined
      : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectableRows = rows.filter((row) => row.getCanSelect());
  const selectedOnPage = selectableRows.filter((row) => rowSelection[row.id]).length;
  const selectAll = selection
    ? {
        checked:
          selectableRows.length > 0 && selectedOnPage === selectableRows.length
            ? true
            : selectedOnPage > 0
              ? ("indeterminate" as const)
              : false,
        onCheckedChange: (value: boolean | "indeterminate") => {
          const next = { ...rowSelection };
          for (const row of selectableRows) {
            if (value === true) next[row.id] = true;
            else delete next[row.id];
          }
          table.setRowSelection(next);
        },
      }
    : undefined;

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

  const activePendingRowKey = isRowPending ? pendingRowKey : null;

  const currentPage =
    serverPag !== null
      ? serverPag.page - 1
      : cursorPag !== null
        ? 0
        : clientPage;
  const totalPages =
    serverPag !== null
      ? Math.ceil(serverPag.total / serverPag.pageSize)
      : cursorPag !== null
        ? 1
        : table.getPageCount();
  const totalItems = serverPag !== null ? serverPag.total : data.length;
  const pSize =
    serverPag !== null
      ? serverPag.pageSize
      : cursorPag !== null
        ? cursorPag.pageSize
        : clientPageSize;
  const hasPageSizeControl = !!(
    serverPag?.onPageSizeChange ??
    cursorPag?.onPageSizeChange ??
    clientPag?.onPageSizeChange
  );
  const showPagination =
    cursorPag !== null
      ? cursorPag.cursorVariant === "load-more"
        ? data.length > 0
        : (data.length > 0 || cursorPag.hasPrevious) &&
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
    <div
      className={cn(
        "flex w-full min-w-0 flex-col rounded-md border border-border bg-card",
        fillHeight ? "h-full min-h-0 flex-1" : "h-auto",
        className,
      )}
    >
      {(search !== undefined || toolbar !== undefined) && (
        <div className="shrink-0 flex flex-col gap-2 border-b border-border bg-muted/50 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          {search !== undefined ? (
            <SearchInput
              value={search.value}
              onValueChange={handleSearchChange}
              placeholder={search.placeholder ?? "Search…"}
              aria-label={search.placeholder ?? "Search"}
              className="min-w-0"
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
      <div
        role={scrollRegionLabel ? "region" : undefined}
        aria-label={scrollRegionLabel}
        tabIndex={scrollRegionLabel ? 0 : undefined}
        className={cn(
          "flex flex-col overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          fillHeight
            ? "min-h-0 flex-1 overflow-auto [-webkit-overflow-scrolling:touch]"
            : "overflow-visible",
        )}
      >
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
            {loadingStalled && onStalledRetry ? (
              <StalledReadNotice
                subject="results"
                onRetry={onStalledRetry}
                className="m-2"
              />
            ) : null}
            {mobileCard ? (
              <div
                className={cn(
                  "flex flex-col gap-2 p-1",
                  MOBILE_CARD_BREAKPOINT[mobileCardBreakpoint].cards,
                )}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : null}
            <div
              style={minWidth && minWidth !== "auto" ? { minWidth } : undefined}
              className={cn(
                (!minWidth || minWidth === "content") && "min-w-max",
                mobileCard &&
                  MOBILE_CARD_BREAKPOINT[mobileCardBreakpoint].table,
              )}
            >
              <Table
                containerClassName="overflow-visible"
                containerFocusable={!scrollRegionLabel}
              >
                <DataTableHeader
                  table={table}
                  announceSort={false}
                  rowIndex={1}
                  stickyTop={stickyHeaderTop}
                  selectAll={selectAll}
                />
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
          <div className="flex flex-1 min-h-0 h-full flex-col justify-center p-2 [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none">
            {emptyState ?? (
              <ChartEmptyState message="No results found." height={260} />
            )}
          </div>
        ) : (
          <>
            {mobileCard ? (
              <div
                className={cn(
                  "flex flex-col gap-2 p-1",
                  MOBILE_CARD_BREAKPOINT[mobileCardBreakpoint].cards,
                )}
              >
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-busy={
                      activePendingRowKey === row.id ? true : undefined
                    }
                    data-pending={
                      activePendingRowKey === row.id ? "true" : undefined
                    }
                    onClick={
                      onRowClick
                        ? () => handleRowActivate(row.original, row.id)
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? createRowActivationKeyHandler(() =>
                            handleRowActivate(row.original, row.id),
                          )
                        : undefined
                    }
                    onContextMenu={
                      onRowContextMenu
                        ? (event: MouseEvent) =>
                            onRowContextMenu(row.original, event)
                        : undefined
                    }
                    className={cn(
                      "rounded-lg border border-border bg-card p-3 text-left touch-manipulation",
                      onRowClick &&
                        "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                mobileCard &&
                  MOBILE_CARD_BREAKPOINT[mobileCardBreakpoint].table,
              )}
            >
              <Table
                containerClassName="overflow-visible"
                containerFocusable={!scrollRegionLabel}
                aria-rowcount={ariaRowCount}
              >
                <DataTableHeader
                  table={table}
                  announceSort
                  rowIndex={1}
                  stickyTop={stickyHeaderTop}
                  selectAll={selectAll}
                />
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow
                      key={row.id}
                      aria-rowindex={firstRowNumber + rowIndex + 1}
                      className={cn(
                        "h-10 hover:bg-muted/50 transition-colors",
                        onRowClick &&
                          "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        "data-[pending=true]:animate-pulse data-[pending=true]:bg-muted",
                        rowClassName?.(row.original, rowIndex),
                      )}
                      aria-busy={
                        activePendingRowKey === row.id ? true : undefined
                      }
                      data-pending={
                        activePendingRowKey === row.id ? "true" : undefined
                      }
                      onClick={
                        onRowClick
                          ? () => handleRowActivate(row.original, row.id)
                          : undefined
                      }
                      onKeyDown={
                        onRowClick
                          ? createRowActivationKeyHandler(() =>
                              handleRowActivate(row.original, row.id),
                            )
                          : undefined
                      }
                      onContextMenu={
                        onRowContextMenu
                          ? (event: MouseEvent) =>
                              onRowContextMenu(row.original, event)
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
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
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
          total={totalItems}
          limit={pSize}
          rowCount={data.length}
          onPageChange={handlePageChange}
          onLimitChange={
            serverPag?.onPageSizeChange ?? clientPag?.onPageSizeChange
          }
          pageSizeOptions={serverPag?.pageSizeOptions}
        />
      )}
    </div>
  );
}

export { DataTableSkeleton } from "./data-table-skeleton";
