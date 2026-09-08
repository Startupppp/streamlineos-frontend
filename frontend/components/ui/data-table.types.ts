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
 * A keyset-paginated server list. There is no `total` and no `page` because a
 * cursor list has neither — the footer is prev/next only, and the fields the
 * other two modes carry are typed `never` so the three cannot be mixed.
 */
type CursorPagination = {
  mode: "cursor";
  pageSize: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  page?: never;
  total?: never;
  onPageChange?: never;
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
    /**
     * Names the row a selection checkbox belongs to. Without it every checkbox
     * in the table is announced identically, so a screen-reader user selecting
     * the fourth row hears the same words as the first and has nothing to
     * confirm the selection against. Return the row's own subject — a name, a
     * title, a reference — not a position.
     */
    getRowLabel?: (row: T, index: number) => string;
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
