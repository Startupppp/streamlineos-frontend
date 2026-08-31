import type { ReactNode } from "react";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    headerClassName?: string;
    sortValue?: (row: TData) => TValue;
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
  pageSizeOptions?: readonly number[];
};

/**
 * A keyset walk: next and previous, no page numbers.
 *
 * The server answers `hasMore` and `nextCursor` instead of a total, so there is
 * no last page to jump to and no count to render. The caller keeps the cursor
 * stack — `hooks/common/use-cursor-pagination.ts` is that stack. Anything that
 * can report a real total stays on `"server"`.
 */
type CursorPagination = {
  mode: "cursor";
  pageSize: number;
  /** Position in the walk, 1-based. Not a page number a caller may jump to. */
  pageNumber: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selection?: {
    selected: Set<string | number>;
    onChange: (sel: Set<string | number>) => void;
    isRowSelectable?: (row: T) => boolean;
  };
  pagination?: ClientPagination | ServerPagination | CursorPagination;
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
  mobileCard?: (row: T, index: number) => ReactNode;
}

export type { ClientPagination, ServerPagination, CursorPagination };
