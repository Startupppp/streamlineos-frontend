"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export type { ColumnDef };

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  manualPagination?: boolean;
  pageCount?: number;
  pageIndex?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  totalCount?: number;
  className?: string;
  rowClassName?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ChevronUp className="h-3.5 w-3.5 text-foreground" />;
  if (direction === "desc") return <ChevronDown className="h-3.5 w-3.5 text-foreground" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyMessage = "No results.",
  pageSize: initialPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  manualPagination = false,
  pageCount,
  pageIndex: controlledPageIndex,
  onPageChange,
  onPageSizeChange,
  totalCount,
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalPageIndex, setInternalPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const currentPageIndex = controlledPageIndex ?? internalPageIndex;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex: currentPageIndex, pageSize },
    },
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function"
        ? updater({ pageIndex: currentPageIndex, pageSize })
        : updater;
      if (next.pageIndex !== currentPageIndex) {
        if (onPageChange) onPageChange(next.pageIndex);
        else setInternalPageIndex(next.pageIndex);
      }
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
        if (onPageSizeChange) onPageSizeChange(next.pageSize);
        if (onPageChange) onPageChange(0);
        else setInternalPageIndex(0);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const totalPages = manualPagination
    ? (pageCount ?? 1)
    : table.getPageCount();
  const canPrev = currentPageIndex > 0;
  const canNext = currentPageIndex < totalPages - 1;

  const displayTotal = totalCount ?? (manualPagination ? undefined : data.length);

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent border-b bg-muted/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id} className="h-9 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          className={cn(
                            "flex items-center gap-1",
                            canSort && "cursor-pointer hover:text-foreground transition-colors",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon direction={header.column.getIsSorted()} />}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map((_, j) => (
                    <TableCell key={j} className="px-3 py-2.5">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-b border-border/50 last:border-0",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(totalPages > 1 || manualPagination) && (
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const size = Number(v);
                setPageSize(size);
                if (onPageSizeChange) onPageSizeChange(size);
                if (onPageChange) onPageChange(0);
                else setInternalPageIndex(0);
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {displayTotal !== undefined && (
              <span className="ml-1">
                {currentPageIndex * pageSize + 1}–
                {Math.min((currentPageIndex + 1) * pageSize, displayTotal)} of {displayTotal}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (onPageChange) onPageChange(currentPageIndex - 1);
                else setInternalPageIndex((p) => p - 1);
              }}
              disabled={!canPrev}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              {currentPageIndex + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (onPageChange) onPageChange(currentPageIndex + 1);
                else setInternalPageIndex((p) => p + 1);
              }}
              disabled={!canNext}
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
