"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
}

interface PaginationConfig {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
}

export function DataTable<T>({
  columns, data, isLoading, emptyIcon, emptyMessage = "No data found",
  emptyAction, pagination, onRowClick, rowKey, selectable,
  onSelectionChange, sortColumn, sortDirection, onSort,
}: DataTableProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  const allSelected = data.length > 0 && data.every(r => selectedKeys.has(rowKey(r)));

  const toggleSelect = useCallback((key: string | number) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    } else {
      const keys = new Set(data.map(r => rowKey(r)));
      setSelectedKeys(keys);
      onSelectionChange?.(data);
    }
  }, [data, allSelected, rowKey, onSelectionChange]);

  // Notify parent of selection changes
  const selectedData = useMemo(() => {
    return data.filter(r => selectedKeys.has(rowKey(r)));
  }, [data, selectedKeys, rowKey]);

  function SortIcon({ column }: { column: string }) {
    if (!sortColumn || sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-[#bd882c]" />
      : <ArrowDown className="h-3 w-3 ml-1 text-[#bd882c]" />;
  }

  return (
    <div className="space-y-0">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                {selectable && (
                  <TableHead className="w-10 px-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-[11px] uppercase tracking-wider font-semibold px-3 py-2.5 whitespace-nowrap",
                      col.width,
                      col.sortable && onSort && "cursor-pointer select-none hover:text-foreground"
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <span className="flex items-center">
                      {col.header}
                      {col.sortable && onSort && <SortIcon column={col.key} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {selectable && <TableCell className="px-3"><Skeleton className="h-4 w-4" /></TableCell>}
                    {columns.map(col => (
                      <TableCell key={col.key} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="text-center py-16"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {emptyIcon}
                      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                      {emptyAction}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, idx) => {
                  const key = rowKey(row);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <TableRow
                      key={key}
                      className={cn(
                        idx % 2 === 1 && "bg-muted/20",
                        isSelected && "bg-[#bd882c]/5",
                        onRowClick && "cursor-pointer",
                        "hover:bg-muted/40 transition-colors"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell className="px-3" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              toggleSelect(key);
                              // Defer selection change notification
                              const next = new Set(selectedKeys);
                              next.has(key) ? next.delete(key) : next.add(key);
                              onSelectionChange?.(data.filter(r => next.has(rowKey(r))));
                            }}
                          />
                        </TableCell>
                      )}
                      {columns.map(col => (
                        <TableCell key={col.key} className="px-3 py-2">
                          {col.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && <DataTablePagination {...pagination} />}
    </div>
  );
}
