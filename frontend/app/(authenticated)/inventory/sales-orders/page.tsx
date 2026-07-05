"use client";

import { Suspense, useDeferredValue, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { EmptyOrdersIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { SO_STATUS_BADGE, SO_STATUS_LABEL, type SoStatus } from "@/features/inventory/lib";
import {
  useSalesOrders,
  type SalesOrderListItem,
} from "@/hooks/api/inventory/sales-orders";

type StatusFilter = "all" | SoStatus;

const SO_STATUSES: ReadonlyArray<SoStatus> = [
  "DRAFT", "CONFIRMED", "PARTIALLY_RESERVED", "RESERVED",
  "PICKED", "PACKED", "PARTIALLY_SHIPPED", "SHIPPED",
  "INVOICED", "CLOSED", "CANCELLED",
];

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  ...SO_STATUSES.map((s): { value: StatusFilter; label: string } => ({ value: s, label: SO_STATUS_LABEL[s] })),
];

function isStatusFilter(v: string): v is StatusFilter {
  return STATUS_OPTIONS.some((o) => o.value === v);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const columns: DataTableColumn<SalesOrderListItem>[] = [
  {
    key: "soNumber",
    header: "SO #",
    cell: (so) => (
      <Link
        href={`/inventory/sales-orders/${so.id}`}
        className="font-mono text-blue-600 hover:underline transition-colors"
      >
        {so.soNumber}
      </Link>
    ),
    sortable: true,
    sortValue: (so) => so.soNumber,
  },
  {
    key: "customer",
    header: "Customer",
    cell: (so) => so.customerName ?? "—",
    sortable: true,
    sortValue: (so) => so.customerName ?? "",
  },
  {
    key: "orderDate",
    header: "Order Date",
    cell: (so) => <span className="tabular-nums">{formatDate(so.orderDate)}</span>,
    sortable: true,
    sortValue: (so) => so.orderDate ?? "",
  },
  {
    key: "requiredDate",
    header: "Required Date",
    cell: (so) => <span className="tabular-nums">{formatDate(so.expectedShipDate)}</span>,
    sortable: true,
    sortValue: (so) => so.expectedShipDate ?? "",
  },
  {
    key: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (so) => Number(so.total).toFixed(2),
    sortable: true,
    sortValue: (so) => Number(so.total),
  },
  {
    key: "status",
    header: "Status",
    cell: (so) => (
      <Badge
        variant="outline"
        className={`h-4 text-[9px] px-1.5 py-0 ${SO_STATUS_BADGE[so.status]}`}
      >
        {SO_STATUS_LABEL[so.status]}
      </Badge>
    ),
  },
];

function SalesOrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status") ?? "all";
  const statusFilter: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";
  const dateFromParam = searchParams.get("from") ?? "";
  const dateToParam = searchParams.get("to") ?? "";
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") ?? "");
  const deferredSearch = useDeferredValue(searchInput);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useSalesOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    dateFrom: dateFromParam || undefined,
    dateTo: dateToParam || undefined,
    limit: 100,
  });

  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (so) =>
        so.soNumber.toLowerCase().includes(q) ||
        (so.customerName?.toLowerCase().includes(q) ?? false),
    );
  }, [query.data?.items, deferredSearch]);

  const isFiltered =
    statusFilter !== "all" || !!dateFromParam || !!dateToParam || !!deferredSearch.trim();
  const displayCount = deferredSearch.trim() ? filtered.length : (query.data?.total ?? 0);
  const subtitle = query.isLoading
    ? undefined
    : `${displayCount} order${displayCount !== 1 ? "s" : ""}`;

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.replace(`?${params.toString()}`);
    }, 300);
  }

  function handleStatusChange(value: string): void {
    if (!isStatusFilter(value)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  function handleDateFromChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("from", e.target.value);
    } else {
      params.delete("from");
    }
    params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  function handleDateToChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("to", e.target.value);
    } else {
      params.delete("to");
    }
    params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    setSearchInput("");
    router.replace("?");
  }

  const filterBar = (
    <>
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search orders…"
          className="h-8 w-full min-w-0 pl-8 text-xs"
          aria-label="Search sales orders"
        />
      </div>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-[160px] min-w-0 text-xs">
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
      <Input
        type="date"
        value={dateFromParam}
        onChange={handleDateFromChange}
        className="h-8 w-[130px] text-xs"
        aria-label="From date"
      />
      <Input
        type="date"
        value={dateToParam}
        onChange={handleDateToChange}
        className="h-8 w-[130px] text-xs"
        aria-label="To date"
      />
    </>
  );

  const emptyState = isFiltered ? (
    <EmptyState
      illustration={<EmptySearchIllustration />}
      title="No matching orders"
      description="No sales orders match your current filters."
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  ) : (
    <EmptyState
      illustration={<EmptyOrdersIllustration />}
      title="No sales orders yet"
      description="Create a sales order to start fulfilling customer requests."
      action={{ label: "New SO", href: "/inventory/sales-orders/new" }}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  );

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Sales Orders"
      subtitle={subtitle}
      actions={
        <Button size="sm" asChild>
          <Link href="/inventory/sales-orders/new">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New SO
          </Link>
        </Button>
      }
      filters={filterBar}
    >
      {query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowKey={(so) => so.id}
          isLoading={query.isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 20 }}
          minWidth="660px"
        />
      )}
    </PageWrapper>
  );
}

export default function SalesOrdersListPage() {
  return (
    <Suspense>
      <SalesOrdersListContent />
    </Suspense>
  );
}
