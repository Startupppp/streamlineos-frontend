"use client";

import { useMemo, useState } from "react";
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
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DataTableColumn,
  DataTableProps,
  ClientPagination,
  ServerPagination,
  CursorPagination,
} from "./data-table.types";
export type { DataTableColumn, DataTableProps };


function SortIndicator({ sorted }: { sorted: "asc" | "desc" | false }) {
  if (sorted === "asc")
    return <ArrowUp className="h-3 w-3 text-primary" />;
  if (sorted === "desc")
    return <ArrowDown className="h-3 w-3 text-primary" />;
  return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
}

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const externalSorting: SortingState = sortState?.field
    ? [{ id: sortState.field, desc: sortState.direction === "desc" }]
    : [];
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>({});
  const [internalPage, setInternalPage] = useState(0);

  const paginationMode =
    pagination !== undefined && "mode" in pagination ? pagination.mode : "client";
  const isServerPagination = paginationMode === "server";
  const isCursorPagination = paginationMode === "cursor";
  const serverPag = isServerPagination ? (pagination as ServerPagination) : null;
  const cursorPag = isCursorPagination ? (pagination as CursorPagination) : null;
  const clientPag =
    paginationMode === "client" ? (pagination as ClientPagination | undefined) : null;
  const clientPageSize = clientPag?.pageSize ?? 50;

  const isRowSelectable = selection?.isRowSelectable;

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
            aria-label="Select all"
          />
        ),
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Select row"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-not-allowed"
                  onClick={(e) => e.stopPropagation()}
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
      defs.push({
        id: col.key,
        header: col.header,
        cell: ({ row }) => col.cell(row.original),
        enableSorting: col.sortable ?? false,
        sortingFn: sortValueFn
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
  }, [columns, selection]);

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    getRowId: (row, index) => String(getRowKey(row, index)),
    state: {
      sorting: sortState ? externalSorting : sorting,
      rowSelection,
      pagination: serverPag
        ? { pageIndex: serverPag.page - 1, pageSize: serverPag.pageSize }
        : cursorPag
          ? { pageIndex: cursorPag.pageNumber - 1, pageSize: cursorPag.pageSize }
          : { pageIndex: internalPage, pageSize: clientPageSize },
    },
    manualSorting: sortState !== undefined,
    manualPagination: isServerPagination || isCursorPagination,
    // -1 is TanStack's "the page count is unknowable", which is the literal
    // truth for a keyset walk.
    pageCount: serverPag
      ? Math.ceil(serverPag.total / serverPag.pageSize)
      : cursorPag
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
      if (isCursorPagination) return;
      if (serverPag) {
        const prev = { pageIndex: serverPag.page - 1, pageSize: serverPag.pageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageIndex !== prev.pageIndex) {
          serverPag.onPageChange(next.pageIndex + 1);
        }
      } else {
        const prev = { pageIndex: internalPage, pageSize: clientPageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        setInternalPage(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortState ? undefined : getSortedRowModel(),
    getPaginationRowModel:
      isServerPagination || isCursorPagination ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;

  const currentPage = serverPag !== null ? serverPag.page - 1 : internalPage;
  const totalPages = serverPag !== null
    ? Math.ceil(serverPag.total / serverPag.pageSize)
    : table.getPageCount();
  const totalItems = serverPag !== null ? serverPag.total : data.length;
  const pSize = serverPag !== null ? serverPag.pageSize : clientPageSize;
  const hasPageSizeControl = !!(serverPag?.onPageSizeChange ?? clientPag?.onPageSizeChange);
  const showPagination = cursorPag
    ? data.length > 0 || cursorPag.hasPrevious
    : pagination !== undefined && totalItems > 0 && (totalPages > 1 || hasPageSizeControl);

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
          <div
            style={minWidth && minWidth !== "auto" ? { minWidth } : undefined}
            className={cn((!minWidth || minWidth === "content") && "min-w-max")}
          >
            <Table containerClassName="overflow-visible">
              <TableHeader className="sticky top-0 z-10 bg-muted/50 border-b border-border">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className="border-b border-border hover:bg-transparent"
                  >
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "text-sm font-medium px-2 py-2",
                            header.column.columnDef.meta?.headerClassName,
                          )}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "flex items-center gap-1 transition-colors hover:text-primary",
                                sorted && "text-primary",
                              )}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIndicator sorted={sorted} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
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
        ) : rows.length === 0 ? (
          <div className="flex flex-1 min-h-0 h-full flex-col justify-center p-2 [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none">
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
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "rounded-lg border border-border bg-card p-3 text-left touch-manipulation",
                    onRowClick && "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            <Table containerClassName="overflow-visible">
              <TableHeader className="sticky top-0 z-10 bg-muted/50 border-b border-border">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className="border-b border-border hover:bg-transparent"
                  >
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "text-sm font-medium px-2 py-2",
                            header.column.columnDef.meta?.headerClassName,
                          )}
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "flex items-center gap-1 transition-colors hover:text-primary",
                                sorted && "text-primary",
                              )}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIndicator sorted={sorted} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "h-10 hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      rowClassName?.(row.original, rowIndex),
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(row.original);
                            }
                          }
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
        <div className="shrink-0 border-t px-2">
          {cursorPag ? (
            <DataTablePagination
              mode="cursor"
              page={cursorPag.pageNumber}
              shown={data.length}
              limit={cursorPag.pageSize}
              hasMore={cursorPag.hasMore}
              hasPrevious={cursorPag.hasPrevious}
              onNext={cursorPag.onNext}
              onPrevious={cursorPag.onPrevious}
              onLimitChange={cursorPag.onPageSizeChange}
              pageSizeOptions={cursorPag.pageSizeOptions}
            />
          ) : (
            <DataTablePagination
              page={currentPage + 1}
              totalPages={totalPages}
              total={totalItems}
              limit={pSize}
              onPageChange={handlePageChange}
              onLimitChange={serverPag?.onPageSizeChange ?? clientPag?.onPageSizeChange}
              pageSizeOptions={serverPag?.pageSizeOptions}
            />
          )}
        </div>
      )}
    </div>
  );
}

export { DataTableSkeleton } from "./data-table-skeleton";
