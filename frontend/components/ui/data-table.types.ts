import type { MouseEvent, ReactNode } from "react";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
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

export interface DataTableSortState {
  fields: readonly string[];
  field: string | null;
  direction: "asc" | "desc";
  onChange: (field: string, direction: "asc" | "desc") => void;
}

type ClientPagination = {
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
};
type ServerPagination = {
  mode: "server";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

type CursorPaginationBase = {
  mode: "cursor";
  pageSize: number;
  pageNumber?: number;
  hasMore: boolean;
  onNext: () => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  showSummary?: boolean;
  page?: never;
  total?: never;
  onPageChange?: never;
};
type CursorPagination = CursorPaginationBase &
  (
    | {
        cursorVariant?: "paged";
        hasPrevious: boolean;
        onPrevious: () => void;
      }
    | {
        cursorVariant: "load-more";
        hasPrevious?: never;
        onPrevious?: never;
      }
  );

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (row: T, event: MouseEvent) => void;
  selection?: {
    selected: ReadonlySet<string | number>;
    onChange: (sel: Set<string | number>) => void;
    isRowSelectable?: (row: T) => boolean;
    getRowLabel?: (row: T, index: number) => string;
  };
  pagination?: ClientPagination | ServerPagination | CursorPagination;
  isLoading?: boolean;
  onStalledRetry?: () => void;
  emptyState?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  className?: string;
  scrollRegionLabel?: string;
  rowClassName?: (row: T, index: number) => string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  toolbar?: ReactNode;
  sortState?: DataTableSortState;
  mobileCard?: (row: T, index: number) => ReactNode;
  mobileCardBreakpoint?: "sm" | "xl";
}

export type { ClientPagination, ServerPagination, CursorPagination };
