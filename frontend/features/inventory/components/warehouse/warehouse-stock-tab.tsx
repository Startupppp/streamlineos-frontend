"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { useWarehouseStock } from "@/hooks/api/inventory/warehouses";
import type { WarehouseStockRow } from "@/types/inventory";

interface WarehouseStockTabProps {
  warehouseId: number;
}

const columns: DataTableColumn<WarehouseStockRow>[] = [
  {
    key: "location",
    header: "Location",
    cell: (row) => (
      <span className="text-[11px]">
        {row.locationName}
        <span className="font-mono text-muted-foreground ml-1">{row.locationCode}</span>
      </span>
    ),
  },
  {
    key: "product",
    header: "Product",
    cell: (row) => (
      <Link
        href={`/inventory/products/${row.productId}`}
        className="text-[11px] hover:underline text-foreground"
      >
        {row.productName}
      </Link>
    ),
  },
  {
    key: "sku",
    header: "SKU",
    cell: (row) => (
      <span className="text-[11px] font-mono text-muted-foreground">{row.variantSku}</span>
    ),
  },
  {
    key: "onHand",
    header: "On Hand",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums">{row.onHand}</span>
    ),
  },
  {
    key: "committed",
    header: "Committed",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
        {row.committed}
      </span>
    ),
  },
  {
    key: "onOrder",
    header: "On Order",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
        {row.onOrder}
      </span>
    ),
  },
];

export function WarehouseStockTab({ warehouseId }: WarehouseStockTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useWarehouseStock(warehouseId, {
    page,
    limit: 20,
  });

  function handleRetry() {
    void refetch();
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  if (isLoading) return <DataTableSkeleton rows={8} columns={6} />;

  if (isError) {
    return (
      <ErrorState
        title="Failed to load stock"
        description="An error occurred while fetching stock data. Please try again."
        onRetry={handleRetry}
        compact
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={(row) => `${row.locationId}-${row.productVariantId}`}
      emptyState={
        <InventoryEmptyState
          title="No stock in this warehouse"
          description="Stock will appear here once goods are received into this warehouse."
          compact
        />
      }
      pagination={
        data && data.totalPages > 1
          ? {
              mode: "server",
              page,
              pageSize: 20,
              total: data.total,
              onPageChange: handlePageChange,
            }
          : undefined
      }
    />
  );
}
