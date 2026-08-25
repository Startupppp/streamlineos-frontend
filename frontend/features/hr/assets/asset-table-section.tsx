"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import type { Asset } from "@/types/hr";

const PAGE_SIZE = 20;

export function AssetTableSection({
  filteredItems,
  columns,
  isLoading,
  isError,
  page,
  total,
  statusFilter,
  onPageChange,
  onRetry,
  onOpenAdd,
}: {
  filteredItems: Asset[];
  columns: DataTableColumn<Asset>[];
  isLoading: boolean;
  isError: boolean;
  page: number;
  total: number;
  statusFilter?: string;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onOpenAdd: () => void;
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card py-16 gap-4">
        <p className="text-sm font-semibold text-foreground">Failed to load assets</p>
        <p className="text-xs text-muted-foreground">Something went wrong.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try Again</Button>
      </div>
    );
  }

  return (
    <DataTable<Asset>
      className="flex-1 min-h-0"
      data={filteredItems}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      pagination={{
        mode: "server",
        page,
        pageSize: PAGE_SIZE,
        total,
        onPageChange,
      }}
      minWidth="900px"
      emptyState={
        <div className="flex flex-1 min-h-0 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-14 px-6 text-center">
          <div className="h-28 w-28">
            <EmptyDevicesIllustration />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No assets found</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} assets match your filter.`
                : "Register your first company asset to get started."}
            </p>
          </div>
          {!statusFilter && (
            <Button size="sm" onClick={onOpenAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Register Asset
            </Button>
          )}
        </div>
      }
    />
  );
}
