"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { EmptyOrdersIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import { SO_STATUS_BADGE, SO_STATUS_LABEL } from "@/features/inventory/lib/inventory-status";
import type { SalesOrderListItem, SalesOrderStatus } from "@/hooks/api/inventory/sales-orders";
import { TruncatedText } from "@/components/ui/truncated-text";

interface SoQueuePageProps {
  status: SalesOrderStatus;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function SoStatusBadge({ status }: { status: SalesOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0", SO_STATUS_BADGE[status])}>
      {SO_STATUS_LABEL[status]}
    </Badge>
  );
}

const columns: DataTableColumn<SalesOrderListItem>[] = [
  {
    key: "soNumber",
    header: "SO #",
    cell: (so) => (
      <Link
        href={`/inventory/sales-orders/${so.id}`}
        className="font-mono text-[11px] text-primary hover:underline transition-colors"
      >
        {so.soNumber}
      </Link>
    ),
    sortable: true,
    sortValue: (so) => so.soNumber,
  },
  {
    key: "customerName",
    header: "Customer",
    cell: (so) => <TruncatedText text={so.customerName ?? "—"} className="text-sm" />,
  },
  {
    key: "orderDate",
    header: "Order Date",
    cell: (so) => (
      <span className="font-mono tabular-nums">{formatDate(so.orderDate)}</span>
    ),
  },
  {
    key: "expectedShipDate",
    header: "Required Date",
    cell: (so) => (
      <span className="font-mono tabular-nums">{formatDate(so.expectedShipDate)}</span>
    ),
    className: "hidden md:table-cell",
    headerClassName: "hidden md:table-cell",
  },
  {
    key: "total",
    header: "Total",
    cell: (so) => (
      <span className="font-mono tabular-nums">{Number(so.total).toFixed(2)}</span>
    ),
    className: "text-right",
    headerClassName: "text-right",
    sortable: true,
    sortValue: (so) => Number(so.total),
  },
  {
    key: "status",
    header: "Status",
    cell: (so) => <SoStatusBadge status={so.status} />,
  },
];

export function SoQueuePage({ status, title, emptyTitle, emptyDescription }: SoQueuePageProps) {
  const [search, setSearch] = useState("");

  const query = useSalesOrders({ status, limit: 50 });

  const allItems = query.data?.items ?? [];

  const items = search.trim()
    ? allItems.filter(
        (so) =>
          so.soNumber.toLowerCase().includes(search.toLowerCase()) ||
          (so.customerName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <SearchInput className="min-w-0 flex-1" value={search} onValueChange={handleSearchChange} placeholder="Search SO # or customer…" />
    </div>
  );

  return (
    <PageWrapper
      title={title}
      subtitle={emptyDescription}
      filters={filterBar}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <DataTable
        data={items}
        columns={columns}
        className="flex-1 min-h-0"
        getRowKey={(so) => so.id}
        isLoading={query.isLoading}
        emptyState={
          query.error ? (
            <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} compact />
          ) : (
            <InventoryEmptyState
              illustration={
                search.trim() ? <EmptySearchIllustration /> : <EmptyOrdersIllustration />
              }
              title={search.trim() ? "No orders match your search" : emptyTitle}
              description={search.trim() ? "Try a different search term." : emptyDescription}
              compact
            />
          )
        }
        minWidth="640px"
      />
      </div>
    </PageWrapper>
  );
}
