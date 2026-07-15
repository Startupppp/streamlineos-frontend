"use client";

import { useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useSalesOrders, type SalesOrderStatus, type SalesOrderListItem } from "@/hooks/api/inventory/sales-orders";

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
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PARTIALLY_RESERVED: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  RESERVED: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  PICKED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PACKED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PARTIALLY_SHIPPED: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  SHIPPED: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  INVOICED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const PAGE_SIZE = 50;

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
    cell: (so) => <span className="font-mono tabular-nums">{formatDate(so.orderDate)}</span>,
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
    cell: (so) => (
      <Badge
        variant="outline"
        className={cn("h-4 text-[9px] px-1.5 py-0", STATUS_CLASS[so.status])}
      >
        {so.status}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "",
    cell: (so) => (
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link href={`/inventory/sales-orders/${so.id}`}>View</Link>
      </Button>
    ),
    className: "w-16",
  },
];

function SalesOrdersContent() {
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

  if (query.error) {
    toast.error(getErrorMessage(query.error));
  }

  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const filterBar = (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <Select value={statusParam} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 text-xs w-[160px]">
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
        className="w-[150px] h-8 text-xs"
      />
      <DatePicker
        value={dateTo}
        onChange={handleDateToChange}
        placeholder="To"
        className="w-[150px] h-8 text-xs"
      />
    </div>
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
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(so) => so.id}
        isLoading={query.isLoading}
        emptyState={
          <EmptyState
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
                    onClick: () => {
                      updateParams({ status: "ALL", dateFrom: "", dateTo: "", page: "1" });
                    },
                  }
                : { label: "New SO", href: "/inventory/sales-orders/new" }
            }
          />
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
        className="flex-1 min-h-0"
      />
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
