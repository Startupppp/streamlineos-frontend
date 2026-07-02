# Canonical DataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a canonical `DataTable<T>` in `components/ui/data-table.tsx` and migrate billing/invoices + 6 org pages to it.

**Architecture:** Extend (rework) the existing `components/ui/data-table.tsx` which already uses `@tanstack/react-table` v8 but has zero callers. Introduce a `DataTableColumn<T>` wrapper API mapped internally to TanStack `ColumnDef<T>`. Fix density to match UI-UX-SYSTEM §4 (condensed: `h-8`, `px-2 py-1`, `text-[11px]`, sticky header `bg-muted/80`). Add `search`/`toolbar`/`selection`/`emptyState`/`footer` props. Then replace hand-rolled `<Table>` blocks in invoices and 6 org pages.

**Tech Stack:** TypeScript strict · `@tanstack/react-table` v8 · shadcn `Table`/`Input`/`Checkbox`/`Button` · `lucide-react`

---

## File Map

| File | Action |
|---|---|
| `frontend/components/ui/data-table.tsx` | Rework (≤400 lines) |
| `frontend/app/(authenticated)/billing/invoices/invoices-client.tsx` | Migrate table (409→~340 lines) |
| `frontend/app/(authenticated)/organization/branches/page.tsx` | Migrate table section (585→~490 lines) |
| `frontend/app/(authenticated)/organization/departments/page.tsx` | Migrate table (495→~405 lines) |
| `frontend/app/(authenticated)/organization/teams/page.tsx` | Migrate table (519→~430 lines) |
| `frontend/app/(authenticated)/organization/locations/page.tsx` | Migrate table (445→~360 lines) |
| `frontend/app/(authenticated)/organization/business-units/page.tsx` | Migrate table (436→~350 lines) |
| `frontend/app/(authenticated)/organization/cost-centers/page.tsx` | Migrate table (423→~340 lines) |
| `frontend/UI-UX-SYSTEM.md` | Add DataTable spec to §7 Components |

---

## Task 1: Rework `components/ui/data-table.tsx`

**Files:**
- Modify: `frontend/components/ui/data-table.tsx`

Key decisions:
- Add module augmentation for `ColumnMeta` to carry `className`/`headerClassName` per column
- `DataTableColumn<T>` maps to `ColumnDef<T>` via `useMemo` inside the component
- Container: `border border-border rounded-md flex flex-col`
- Toolbar strip (shown when `search` or `toolbar` provided): `shrink-0 flex items-center gap-2 px-2 py-1.5 border-b flex-wrap`
- Scrollable body: `flex-1 min-h-0 overflow-auto` → inner `div` with `style={{ minWidth }}`
- Sticky header: `sticky top-0 z-10 bg-muted/80 backdrop-blur-sm`
- Header cells: `text-[10px] uppercase tracking-wider font-bold px-2 py-1.5`
- Data rows: `h-8 hover:bg-muted/30 transition-colors`
- Data cells: `px-2 py-1 text-[11px]`
- Skeleton rows: 5 rows, each `h-8`, cells `px-2 py-1` with `<Skeleton className="h-3 w-full">`
- Empty: `<TableCell colSpan={N} className="p-0">{emptyState}</TableCell>`
- Pagination footer: `shrink-0 flex items-center justify-between px-4 py-2 border-t text-xs`
- Selection: TanStack `rowSelection` state synced with `selection.selected` Set via `getRowKey`

- [ ] **Step 1: Write the new data-table.tsx**

```tsx
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
import { ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  toolbar?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  className?: string;
  rowClassName?: (row: T) => string;
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
  search,
  toolbar,
  footer,
  minWidth,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>({});

  const rowSelection = useMemo<RowSelectionState>(() => {
    if (!selection) return localRowSelection;
    return Object.fromEntries([...selection.selected].map((id) => [String(id), true]));
  }, [selection, localRowSelection]);

  const isServerPagination = pagination && "mode" in pagination && pagination.mode === "server";
  const clientPageSize = !isServerPagination ? (pagination as ClientPagination | undefined)?.pageSize ?? 50 : 20;
  const [internalPage, setInternalPage] = useState(0);

  const serverPag = isServerPagination ? (pagination as ServerPagination) : null;

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
    manualPagination: !!isServerPagination,
    pageCount: isServerPagination ? Math.ceil(serverPag!.total / serverPag!.pageSize) : undefined,
    enableRowSelection: !!selection,
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
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
        if (next.pageIndex !== prev.pageIndex) serverPag!.onPageChange(next.pageIndex + 1);
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
  const colCount = columnDefs.length;

  const currentPage = isServerPagination ? serverPag!.page - 1 : internalPage;
  const totalPages = isServerPagination
    ? Math.ceil(serverPag!.total / serverPag!.pageSize)
    : table.getPageCount();
  const totalItems = isServerPagination ? serverPag!.total : data.length;
  const pSize = isServerPagination ? serverPag!.pageSize : clientPageSize;
  const showPagination = pagination && totalPages > 1;

  return (
    <div className={cn("border border-border rounded-md flex flex-col", className)}>
      {(search || toolbar) && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b flex-wrap">
          {search && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="pl-8 h-8 text-xs max-w-[240px]"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <div style={minWidth ? { minWidth } : undefined} className={cn(!minWidth && "min-w-max")}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-b-2 border-border hover:bg-transparent">
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
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-8 hover:bg-transparent">
                    {columnDefs.map((_, j) => (
                      <TableCell key={j} className="px-2 py-1">
                        <Skeleton className="h-3 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="p-0">
                    {emptyState ?? (
                      <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
                        No results found.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
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
                        className={cn("px-2 py-1 text-[11px]", cell.column.columnDef.meta?.className)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {footer && (
        <div className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">{footer}</div>
      )}
      {showPagination && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <span>
            Showing {currentPage * pSize + 1}–{Math.min((currentPage + 1) * pSize, totalItems)} of {totalItems}
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
            <span className="px-1">{currentPage + 1} / {totalPages}</span>
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
```

- [ ] **Step 2: Verify file is ≤400 lines and types check** (count lines manually)

---

## Task 2: Migrate invoices-client.tsx

**Files:**
- Modify: `frontend/app/(authenticated)/billing/invoices/invoices-client.tsx`
- Before: 409 lines (hand-rolled `<Table>` with inline loading/error/empty states)
- After: ~340 lines (DataTable + column defs)

Key changes:
- Add `import { DataTable, type DataTableColumn } from "@/components/ui/data-table"`
- Remove: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton` imports (no longer needed inline)
- Define `const invoiceColumns: DataTableColumn<Invoice>[]` outside the component (all 7 columns: Invoice #, Client, Amount, Status, Due Date, Created, Actions)
- The Actions column `cell` uses a closure over `handleUpdateStatus` and `handleDeleteInvoice`
- Replace the `<div className="border..."><div className="min-w..."><Table>...</Table></div></div>` block with `<DataTable data={invoices} columns={...} getRowKey={(inv) => inv.id} isLoading={isLoading} emptyState={...} minWidth="700px" />`
- The `InvoiceTableRow` component becomes inline in column cell functions
- Keep error state outside DataTable (pass via `emptyState` or handle above DataTable)

- [ ] **Step 1: Rewrite invoices-client.tsx with DataTable**

---

## Task 3–8: Migrate 6 org pages

**Pattern for all 6 pages (identical structure):**
1. Add `import { DataTable, type DataTableColumn } from "@/components/ui/data-table"`
2. Remove: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` imports
3. Define `columns: DataTableColumn<EntityType>[]` array with Name, Code, [parent], Status, Actions columns
4. Remove the conditional ternary: `isLoading ? <SkeletonTable> : filtered.length === 0 ? <EmptyState> : <div><Table></div>`
5. Remove `filters` from PageWrapper (move to DataTable)
6. Render `<DataTable data={displayed} columns={columns} getRowKey={(e) => e.id} isLoading={isLoading} search={{ value: search, onChange: setSearch, placeholder: "..." }} toolbar={archiveToggleNode} emptyState={emptyStateNode} minWidth="580px" />`
7. The `emptyState` node is the correct conditional EmptyState based on `search`/`showArchived`

---

## Task 9: Update UI-UX-SYSTEM.md

Add a `### DataTable` subsection in §7 Components after the existing "Data tables" section:
- Component API summary table
- Usage example (org page pattern)
- List of remaining admin table migration candidates

---
