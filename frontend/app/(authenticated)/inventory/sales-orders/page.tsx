"use client";

import { useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyOrdersIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { cn } from "@/lib/utils";

import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useSalesOrders, type SalesOrderStatus, type SalesOrderListItem } from "@/hooks/api/inventory/sales-orders";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";

type StatusFilter = "ALL" | SalesOrderStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "CANCELLED", label: "Cancelled" },
];

const VALID_STATUSES = new Set<string>([
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "PICKED",
  "PACKED",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "INVOICED",
  "CLOSED",
  "CANCELLED",
]);

const STATUS_CLASS: Record<SalesOrderStatus, string> = {
  DRAFT: "",
  CONFIRMED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIALLY_RESERVED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  RESERVED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  PICKED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PACKED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIALLY_SHIPPED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  SHIPPED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  INVOICED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "",
};

const PAGE_SIZE = 50;

const columns: DataTableColumn<SalesOrderListItem>[] = [
  {
    key: "soNumber",
    header: "SO #",
    cell: (so) => (
      <Link
        href={`/inventory/sales-orders/${so.id}`}
        className="font-mono text-dense text-primary hover:underline transition-colors"
      >
        {so.soNumber}
      </Link>
    ),
  },
  {
    key: "customerName",
    header: "Customer",
    cell: (so) => so.customerName ?? "—",
  },
  {
    key: "orderDate",
    header: "Order Date",
    cell: (so) => <span className="font-mono tabular-nums">{formatShortDate(so.orderDate) || "—"}</span>,
  },
  {
    key: "expectedShipDate",
    header: "Required Date",
    cell: (so) => (
      <span className="font-mono tabular-nums">{formatShortDate(so.expectedShipDate) || "—"}</span>
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
  },
  {
    key: "status",
    header: "Status",
    cell: (so) => (
      <Badge
        variant="outline"
        className={cn("h-4 text-micro px-1.5 py-0", STATUS_CLASS[so.status])}
      >
        {so.status}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "",
    cell: (so) => (
      <Button variant="ghost" size="sm" className="text-xs" asChild>
        <Link href={`/inventory/sales-orders/${so.id}`}>View</Link>
      </Button>
    ),
    className: "w-16",
  },
];

function SalesOrdersContent() {
  const canView = useCan("inventory:sales-orders:read");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const statusParam = searchParams.get("status") ?? "ALL";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const resolvedStatus: SalesOrderStatus | undefined =
    VALID_STATUSES.has(statusParam) && statusParam !== "ALL"
      ? (statusParam as SalesOrderStatus)
      : undefined;

  function updateParams(updates: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "ALL" || value === "" || (key === "page" && value === "1")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value, page: "1" });
  }

  function handleDateFromChange(value: string): void {
    updateParams({ dateFrom: value, page: "1" });
  }

  function handleDateToChange(value: string): void {
    updateParams({ dateTo: value, page: "1" });
  }

  function handlePageChange(nextPage: number): void {
    updateParams({ page: String(nextPage) });
  }

  const query = useSalesOrders({
    status: resolvedStatus,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = statusParam !== "ALL" || dateFrom !== "" || dateTo !== "";

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    updateParams({ status: "ALL", dateFrom: "", dateTo: "", page: "1" });
  }

  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <Select value={statusParam} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[160px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePicker
        value={dateFrom}
        onChange={handleDateFromChange}
        placeholder="From"
        className="w-[150px] text-xs"
      />
      <DatePicker
        value={dateTo}
        onChange={handleDateToChange}
        placeholder="To"
        className="w-[150px] text-xs"
      />
    </div>
  );

  if (!canView)
    return (
      <PageWrapper
        title="Sales Orders"
        subtitle="Manage customer sales orders from creation to invoicing."
      >
        <NoPermissionState permission="inventory:sales-orders:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Sales Orders"
      subtitle="Manage customer sales orders from creation to invoicing."
      actions={
        <Button asChild {...hoverHandlers}>
          <Link href="/inventory/sales-orders/new">
            <PlusIcon ref={iconRef} size={14} className="mr-1" />
            New SO
          </Link>
        </Button>
      }
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
            <ErrorState
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
              compact
            />
          ) : (
            <InventoryEmptyState
              illustration={
                hasFilters ? <EmptySearchIllustration /> : <EmptyOrdersIllustration />
              }
              title={hasFilters ? "No orders match your filters" : "No sales orders yet"}
              description={
                hasFilters
                  ? "Try adjusting the status or date range."
                  : "Create a sales order to start fulfilling customer requests."
              }
              action={
                hasFilters
                  ? {
                      label: "Clear filters",
                      onClick: handleClearFilters,
                    }
                  : { label: "New SO", href: "/inventory/sales-orders/new" }
              }
              className={CONTENT_FILL_PANEL}
            />
          )
        }
        pagination={
          totalPages > 1
            ? {
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: handlePageChange,
              }
            : undefined
        }
        minWidth="640px"
      />
      </div>
    </PageWrapper>
  );
}

export default function SalesOrdersListPage() {
  return (
    <Suspense>
      <SalesOrdersContent />
    </Suspense>
  );
}
