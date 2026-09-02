"use client";

import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

function SortIndicator({ sorted }: { sorted: "asc" | "desc" | false }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3 text-primary" />;
  if (sorted === "desc") return <ArrowDown className="h-3 w-3 text-primary" />;
  return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
}

interface DataTableHeaderProps<T> {
  table: TanstackTable<T>;
  announceSort: boolean;
  rowIndex: number;
}

export function DataTableHeader<T>({
  table,
  announceSort,
  rowIndex,
}: DataTableHeaderProps<T>) {
  return (
    <TableHeader className="sticky top-0 z-10 bg-muted/50 border-b border-border">
      {table.getHeaderGroups().map((hg) => (
        <TableRow
          key={hg.id}
          aria-rowindex={rowIndex}
          className="border-b border-border hover:bg-transparent"
        >
          {hg.headers.map((header) => {
            const canSort = header.column.getCanSort();
            const sorted = header.column.getIsSorted();
            const headerLabel =
              typeof header.column.columnDef.header === "string"
                ? header.column.columnDef.header
                : undefined;
            return (
              <TableHead
                key={header.id}
                className={cn(
                  "text-sm font-medium px-2 py-2",
                  header.column.columnDef.meta?.headerClassName,
                )}
                aria-sort={
                  !announceSort
                    ? undefined
                    : sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : undefined
                }
              >
                {header.isPlaceholder ? null : canSort ? (
                  <button
                    type="button"
                    aria-label={headerLabel ? `Sort by ${headerLabel}` : undefined}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "flex items-center gap-1 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  );
}
