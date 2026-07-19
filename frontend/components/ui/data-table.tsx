"use client";

import { useMemo, useState, type ReactNode } from "react";
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

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
    headerClassName?: string;
  }
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

type ClientPagination = { pageSize?: number; onPageSizeChange?: (pageSize: number) => void };
type ServerPagination = {
  mode: "server";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selection?: {
    selected: Set<string | number>;
    onChange: (sel: Set<string | number>) => void;
  };
  pagination?: ClientPagination | ServerPagination;
  isLoading?: boolean;
  emptyState?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  toolbar?: ReactNode;
  sortState?: {
    field: string | null;
    direction: "asc" | "desc";
    onChange: (field: string, direction: "asc" | "desc") => void;
  };
}

function SortIndicator({ sorted }: { sorted: "asc" | "desc" | false }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />;
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />;
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
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const externalSorting: SortingState = sortState?.field
    ? [{ id: sortState.field, desc: sortState.direction === "desc" }]
    : [];
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>({});
  const [internalPage, setInternalPage] = useState(0);

  const isServerPagination =
    pagination !== undefined && "mode" in pagination && pagination.mode === "server";
  const serverPag = isServerPagination ? (pagination as ServerPagination) : null;
  const clientPag = !isServerPagination ? (pagination as ClientPagination | undefined) : null;
  const clientPageSize = clientPag?.pageSize ?? 50;

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
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        meta: { className: "w-8" },
      });
    }

    for (const col of columns) {
      defs.push({
        id: col.key,
        header: col.header,
        cell: ({ row }) => col.cell(row.original),
        enableSorting: col.sortable ?? false,
        sortingFn: col.sortValue
          ? (rowA, rowB) => {
              const a = col.sortValue!(rowA.original);
              const b = col.sortValue!(rowB.original);
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
      pagination: isServerPagination
        ? { pageIndex: serverPag!.page - 1, pageSize: serverPag!.pageSize }
        : { pageIndex: internalPage, pageSize: clientPageSize },
    },
    manualSorting: sortState !== undefined,
    manualPagination: isServerPagination,
    pageCount: isServerPagination
      ? Math.ceil(serverPag!.total / serverPag!.pageSize)
      : undefined,
    enableRowSelection: !!selection,
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
      if (isServerPagination) {
        const prev = { pageIndex: serverPag!.page - 1, pageSize: serverPag!.pageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageIndex !== prev.pageIndex) {
          serverPag!.onPageChange(next.pageIndex + 1);
        }
      } else {
        const prev = { pageIndex: internalPage, pageSize: clientPageSize };
        const next = typeof updater === "function" ? updater(prev) : updater;
        setInternalPage(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortState ? undefined : getSortedRowModel(),
    getPaginationRowModel: isServerPagination ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;

  const currentPage = isServerPagination ? serverPag!.page - 1 : internalPage;
  const totalPages = isServerPagination
    ? Math.ceil(serverPag!.total / serverPag!.pageSize)
    : table.getPageCount();
  const totalItems = isServerPagination ? serverPag!.total : data.length;
  const pSize = isServerPagination ? serverPag!.pageSize : clientPageSize;
  const showPagination = pagination !== undefined && totalPages > 1;

  function handleSearchChange(value: string) {
    search?.onChange(value);
  }

  function handlePageChange(nextPage: number) {
    if (serverPag) serverPag.onPageChange(nextPage);
    else setInternalPage(nextPage - 1);
  }

  return (
    <div className={cn("border border-border rounded-md flex flex-col min-w-0", className)}>
      {(search !== undefined || toolbar !== undefined) && (
        <div className="shrink-0 flex flex-col gap-2 border-b border-border bg-card bg-muted/40 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          {search !== undefined ? (
            <SearchInput
              value={search.value}
              onValueChange={handleSearchChange}
              placeholder={search.placeholder ?? "Search…"}
              aria-label={search.placeholder ?? "Search"}
              className="w-full min-w-0 sm:w-56 sm:max-w-xs"
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
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 border-b border-border backdrop-blur-sm">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className="border-b-2 border-border hover:bg-transparent"
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
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
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
          <div className="flex flex-1 flex-col justify-center p-2 [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none">
            {emptyState ?? (
              <ChartEmptyState message="No results found." height={260} />
            )}
          </div>
        ) : (
          <div
            style={minWidth && minWidth !== "auto" ? { minWidth } : undefined}
            className={cn((!minWidth || minWidth === "content") && "min-w-max")}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 border-b border-border backdrop-blur-sm">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className="border-b-2 border-border hover:bg-transparent"
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
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
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
                      "h-10 hover:bg-muted/30 transition-colors",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row.original, rowIndex),
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
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
        )}
      </div>

      {footer !== undefined && (
        <div className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
          {footer}
        </div>
      )}

      {showPagination && (
        <div className="shrink-0 border-t px-3">
          <DataTablePagination
            page={currentPage + 1}
            totalPages={totalPages}
            total={totalItems}
            limit={pSize}
            onPageChange={handlePageChange}
            onLimitChange={serverPag?.onPageSizeChange ?? clientPag?.onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}

export function DataTableSkeleton({
  rows = 12,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("border border-border rounded-md overflow-hidden", className)}>
      <Table>
        <TableHeader className="bg-muted/40 border-b border-border">
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <TableHead key={colIdx} className="px-2 py-2">
                <Skeleton className="h-3.5 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx} className="h-10 hover:bg-transparent">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx} className="px-2 py-2">
                  <Skeleton className={cn("h-3.5", colIdx === 0 ? "w-3/4" : "w-1/2")} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
