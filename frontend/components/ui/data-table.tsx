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
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

type ClientPagination = { pageSize?: number };
type ServerPagination = {
  mode: "server";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string | number;
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
  rowClassName?: (row: T) => string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  toolbar?: ReactNode;
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
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>({});
  const [internalPage, setInternalPage] = useState(0);

  const isServerPagination =
    pagination !== undefined && "mode" in pagination && pagination.mode === "server";
  const serverPag = isServerPagination ? (pagination as ServerPagination) : null;
  const clientPageSize =
    !isServerPagination ? ((pagination as ClientPagination | undefined)?.pageSize ?? 50) : 20;

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
    getRowId: (row) => String(getRowKey(row)),
    state: {
      sorting,
      rowSelection,
      pagination: isServerPagination
        ? { pageIndex: serverPag!.page - 1, pageSize: serverPag!.pageSize }
        : { pageIndex: internalPage, pageSize: clientPageSize },
    },
    manualPagination: isServerPagination,
    pageCount: isServerPagination
      ? Math.ceil(serverPag!.total / serverPag!.pageSize)
      : undefined,
    enableRowSelection: !!selection,
    onSortingChange: setSorting,
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
    getSortedRowModel: getSortedRowModel(),
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

  function handleSearchInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    search?.onChange(e.target.value);
  }

  return (
    <div className={cn("border border-border rounded-md flex flex-col", className)}>
      {(search !== undefined || toolbar !== undefined) && (
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
          {search !== undefined ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={handleSearchInputChange}
                placeholder={search.placeholder ?? "Search…"}
                aria-label={search.placeholder ?? "Search"}
                className="h-8 w-56 pl-7 text-xs"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div
            style={minWidth ? { minWidth } : undefined}
            className={cn(!minWidth && "min-w-max")}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
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
                            "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5",
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-8 hover:bg-transparent">
                    {columnDefs.map((_, j) => (
                      <TableCell key={j} className="px-2 py-1">
                        <Skeleton className="h-3 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-2">
            {emptyState ?? (
              <ChartEmptyState message="No results found." height={260} />
            )}
          </div>
        ) : (
          <div
            style={minWidth ? { minWidth } : undefined}
            className={cn(!minWidth && "min-w-max")}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
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
                            "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5",
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
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "h-8 hover:bg-muted/30 transition-colors",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row.original),
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-2 py-1 text-[11px]",
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
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <span>
            Showing {currentPage * pSize + 1}–
            {Math.min((currentPage + 1) * pSize, totalItems)} of {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => table.previousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages - 1}
              onClick={() => table.nextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
