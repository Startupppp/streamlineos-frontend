"use client";

import type { MouseEvent, ReactNode } from "react";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface BuildListSurfaceCursorPaginationBase {
  mode: "cursor";
  pageSize: number;
  /** One-based cursor-walk or loaded-batch position. */
  pageNumber: number;
  hasMore: boolean;
  onNext: () => void;
}

export type BuildListSurfaceCursorPagination =
  BuildListSurfaceCursorPaginationBase &
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

export interface BuildListSurfaceServerPagination {
  mode: "server";
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

export type BuildListSurfacePagination =
  | BuildListSurfaceCursorPagination
  | BuildListSurfaceServerPagination;

export interface BuildListSurfaceProps<TRow> {
  permission: PermissionKey;
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isFiltered?: boolean;
  pagination?: BuildListSurfacePagination;
  toolbar?: ReactNode;
  empty: ReactNode;
  filteredEmpty?: ReactNode;
  loading?: ReactNode;
  onRetry?: () => void;
  getRowKey: (row: TRow, index: number) => string | number;
  onRowClick?: (row: TRow) => void;
  onRowContextMenu?: (row: TRow, event: MouseEvent) => void;
  mobileCard?: (row: TRow, index: number) => ReactNode;
  selection?: {
    selected: ReadonlySet<string | number>;
    onChange: (sel: Set<string | number>) => void;
    isRowSelectable?: (row: TRow) => boolean;
    getRowLabel?: (row: TRow, index: number) => string;
  };
  isFetchingMore?: boolean;
  compact?: boolean;
  tableClassName?: string;
  minWidth?: string;
  footer?: ReactNode;
  rowClassName?: (row: TRow, index: number) => string;
  sortState?: DataTableSortState;
  loadingRows?: number;
  loadingHeaders?: readonly string[];
  className?: string;
}

export function BuildListSurface<TRow>({
  permission,
  rows,
  columns,
  isLoading,
  isError,
  error,
  isFiltered = false,
  pagination,
  toolbar,
  empty,
  filteredEmpty,
  loading,
  onRetry,
  getRowKey,
  onRowClick,
  onRowContextMenu,
  mobileCard,
  selection,
  isFetchingMore,
  compact,
  tableClassName,
  minWidth,
  footer,
  rowClassName,
  sortState,
  loadingRows = 8,
  loadingHeaders,
  className,
}: BuildListSurfaceProps<TRow>) {
  const resolution = usePageState({
    permission,
    isLoading,
    isError,
    error,
    isEmpty: rows.length === 0,
  });

  const resolvedEmpty =
    isFiltered && filteredEmpty != null ? filteredEmpty : empty;

  const resolvedLoading = loading ?? (
    <DataTableSkeleton
      rows={loadingRows}
      headers={loadingHeaders}
      mobileCards
      className="flex-1"
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toolbar != null ? <div className="mb-3">{toolbar}</div> : null}
      <PageState
        resolution={resolution}
        loading={resolvedLoading}
        empty={resolvedEmpty}
        onRetry={onRetry}
        compact={compact}
        className={className ?? CONTENT_FILL_PANEL}
      >
        <DataTable<TRow>
          data={rows}
          columns={columns}
          getRowKey={getRowKey}
          onRowClick={onRowClick}
          onRowContextMenu={onRowContextMenu}
          mobileCard={mobileCard}
          selection={selection}
          pagination={
            pagination === undefined || pagination.mode === "server"
              ? pagination
              : {
                  ...pagination,
                }
          }
          isLoading={isFetchingMore}
          minWidth={minWidth}
          footer={footer}
          rowClassName={rowClassName}
          sortState={sortState}
          className={tableClassName ?? CONTENT_FILL_PANEL}
        />
      </PageState>
    </div>
  );
}
