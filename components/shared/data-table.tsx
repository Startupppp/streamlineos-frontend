"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  // Pagination (controlled — pass undefined for no pagination)
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  // Empty state
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: { label: string; onClick: () => void };
  // Optional class overrides
  className?: string;
  tableClassName?: string;
  // Row selection
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  // Skeleton row count while loading
  skeletonRows?: number;
}

const SKELETON_COLUMNS = 5;

function SkeletonRows({
  rows,
  cols,
}: {
  rows: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 rounded bg-muted animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  emptyTitle = "No results",
  emptyDescription,
  emptyIcon,
  emptyAction,
  className,
  tableClassName,
  rowSelection,
  onRowSelectionChange,
  skeletonRows = 8,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection: rowSelection ?? {},
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const next =
            typeof updater === "function"
              ? updater(rowSelection ?? {})
              : updater;
          onRowSelectionChange(next);
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: page !== undefined,
    manualSorting: false,
  });

  const hasPagination =
    page !== undefined &&
    totalPages !== undefined &&
    total !== undefined &&
    limit !== undefined &&
    onPageChange !== undefined;

  const colSpan = columns.length;

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Scrollable table area */}
      <div className="flex-1 overflow-auto min-h-0">
        <Table className={cn("relative", tableClassName)}>
          {/* Sticky header */}
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-0">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-9 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap select-none",
                        canSort && "cursor-pointer hover:text-foreground transition-colors"
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                          ? "descending"
                          : canSort
                          ? "none"
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="ml-0.5 opacity-60">
                              {sorted === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={skeletonRows} cols={Math.min(colSpan, SKELETON_COLUMNS)} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="rounded-none border-x-0 border-b-0 border-dashed"
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sticky pagination */}
      {hasPagination && (
        <div className="shrink-0 border-t border-border/60 bg-background px-2">
          <DataTablePagination
            page={page!}
            totalPages={totalPages!}
            total={total!}
            limit={limit!}
            onPageChange={onPageChange!}
            onLimitChange={onLimitChange}
          />
        </div>
      )}
    </div>
  );
}
