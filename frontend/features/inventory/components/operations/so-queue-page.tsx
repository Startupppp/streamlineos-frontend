"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { EmptyOrdersIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import { SO_STATUS_BADGE, SO_STATUS_LABEL } from "@/features/inventory/lib/inventory-status";
import type { SalesOrderListItem, SalesOrderStatus } from "@/hooks/api/inventory/sales-orders";

interface SoQueuePageProps {
  status: SalesOrderStatus;
  title: string;
  actionNoun: string;
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
    cell: (so) => so.customerName ?? "—",
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

export function SoQueuePage({ status, title, actionNoun, emptyTitle, emptyDescription }: SoQueuePageProps) {
  const [search, setSearch] = useState("");

  const query = useSalesOrders({ status, limit: 50 });

  const allItems = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const items = search.trim()
    ? allItems.filter(
        (so) =>
          so.soNumber.toLowerCase().includes(search.toLowerCase()) ||
          (so.customerName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const filterBar = (
    <div className="relative min-w-0 flex-1 max-w-sm">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={search}
        onChange={handleSearchChange}
        placeholder="Search SO # or customer…"
        className="h-8 w-full pl-8 text-xs"
      />
    </div>
  );

  return (
    <PageWrapper
      title={title}
      subtitle={query.data ? `${total} ${total === 1 ? "order" : "orders"} to ${actionNoun}` : undefined}
      filters={filterBar}
    >
      <DataTable
        data={items}
        columns={columns}
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
        className="flex-1 min-h-0"
      />
    </PageWrapper>
  );
}
