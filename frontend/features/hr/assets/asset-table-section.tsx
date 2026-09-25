"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import type { Asset } from "@/types/hr";

const PAGE_SIZE = 20;

export function AssetTableSection({
  filteredItems,
  columns,
  isLoading,
  hasMore,
  hasPrevious,
  statusFilter,
  onNextPage,
  onPreviousPage,
  onOpenAdd,
}: {
  filteredItems: Asset[];
  columns: DataTableColumn<Asset>[];
  isLoading: boolean;
  hasMore: boolean;
  hasPrevious: boolean;
  statusFilter?: string;
  onNextPage: () => void;
  onPreviousPage: () => void;
  /** Absent when the caller cannot create assets (hr:assets:manage). */
  onOpenAdd?: () => void;
}) {
  return (
    <DataTable<Asset>
      className="flex-1 min-h-0"
      data={filteredItems}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      pagination={{
        mode: "cursor",
        pageSize: PAGE_SIZE,
        hasMore,
        hasPrevious,
        onNext: onNextPage,
        onPrevious: onPreviousPage,
      }}
      minWidth="900px"
      emptyState={
        <EmptyState
          className="border-0 bg-transparent min-h-[40vh]"
          illustration={<EmptyDevicesIllustration />}
          title="No assets found"
          description={statusFilter ? `No ${statusFilter.toLowerCase()} assets match your filter.` : "Register your first company asset to get started."}
          action={!statusFilter && onOpenAdd ? { label: "Register Asset", onClick: onOpenAdd } : undefined}
        />
      }
    />
  );
}
