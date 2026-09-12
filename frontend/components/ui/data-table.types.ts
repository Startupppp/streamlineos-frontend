import type { ReactNode } from "react";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  /**
   * Merging onto `ColumnMeta` requires this declaration's type parameters to
   * match the library's by name (TS2428), and neither member needs them.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see above
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    headerClassName?: string;
  }
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /**
   * Reorders the rows the table holds, and is honoured only while the table
   * holds every row it will show: client pagination and no `sortState`. On a
   * server- or cursor-paginated table it is inert, because sorting one page
   * would present a slice as the sorted set. A server sort is
   * `sortState.fields`, never this.
   */
  sortable?: boolean;
  /** What `sortable` compares when the row's own `key` value is not it. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

/**
 * Sorting is the server's, and `fields` is the list of `key`s the endpoint
 * actually accepts — a column outside it gets no control, so a header can never
 * ask for an order the API will ignore.
 */
export interface DataTableSortState {
  fields: readonly string[];
  field: string | null;
  direction: "asc" | "desc";
  onChange: (field: string, direction: "asc" | "desc") => void;
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
 * can report a real total stays on `"server"`. The fields the other two modes
 * carry are typed `never` so the three cannot be mixed.
 */
type CursorPagination = {
  mode: "cursor";
  pageSize: number;
  /**
   * Position in the walk, 1-based, when the caller keeps one. Not a page number
   * a caller may jump to.
   */
  pageNumber?: number;
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
  sortState?: DataTableSortState;
  /**
   * Optional mobile card renderer. When provided, cards replace the table
   * below the `sm` breakpoint to avoid horizontal page overflow at 375/390px.
   */
  mobileCard?: (row: T, index: number) => ReactNode;
}

export type { ClientPagination, ServerPagination, CursorPagination };
