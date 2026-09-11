"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn, DataTableSkeleton } from "@/components/ui/data-table";

import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useExpiryReport, type ExpiryReportRow } from "@/hooks/api/inventory/reports";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { LOT_STATUS_BADGE, LOT_STATUS_LABEL, type LotStatus, downloadCsv } from "@/features/inventory/lib";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";

const LIMIT = 50;

const WITHIN_DAYS_OPTIONS = [
  { value: "7", label: "Within 7 days" },
  { value: "14", label: "Within 14 days" },
  { value: "30", label: "Within 30 days" },
  { value: "60", label: "Within 60 days" },
  { value: "90", label: "Within 90 days" },
] as const;

const LOT_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "RECALLED", label: "Recalled" },
];

function DaysUntilExpiryCell({ days }: { days: number }) {
  if (days <= 0) {
    return <span className="font-mono tabular-nums text-status-danger-ink font-medium">Expired</span>;
  }
  if (days <= 7) {
    return <span className="font-mono tabular-nums text-status-danger-ink font-medium">{days}</span>;
  }
  if (days <= 30) {
    return <span className="font-mono tabular-nums text-status-warning-ink font-medium">{days}</span>;
  }
  return <span className="font-mono tabular-nums">{days}</span>;
}

function LotStatusBadge({ status }: { status: string }) {
  const key = status as LotStatus;
  const badgeClass = LOT_STATUS_BADGE[key] ?? "bg-muted text-muted-foreground border-border";
  const label = LOT_STATUS_LABEL[key] ?? status;
  return (
    <Badge variant="outline" className={`h-4 text-micro px-1.5 py-0 ${badgeClass}`}>
      {label}
    </Badge>
  );
}

function buildColumns(): DataTableColumn<ExpiryReportRow>[] {
  return [
    {
      key: "lotNumber",
      header: "Lot #",
      cell: (row) => <span className="font-mono tabular-nums text-dense">{row.lotNumber}</span>,
    },
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span className="font-medium">{row.productName}</span>,
    },
    {
      key: "variantSku",
      header: "SKU",
      cell: (row) => <span className="font-mono text-dense">{row.variantSku}</span>,
    },
    {
      key: "totalOnHand",
      header: "On Hand",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums">{parseFloat(row.totalOnHand)}</span>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      cell: (row) => <span className="text-dense">{formatShortDate(row.expiryDate) || ""}</span>,
    },
    {
      key: "daysUntilExpiry",
      header: "Days Until Expiry",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <DaysUntilExpiryCell days={row.daysUntilExpiry} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <LotStatusBadge status={row.status} />,
    },
  ];
}

function exportToCsv(rows: ExpiryReportRow[]): void {
  downloadCsv(
    `expiry-report-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Lot #", "Product", "SKU", "On Hand", "Expiry Date", "Days Until Expiry", "Status"],
    rows.map((r) => [
      r.lotNumber,
      r.productName,
      r.variantSku,
      parseFloat(r.totalOnHand),
      formatShortDate(r.expiryDate) || "",
      r.daysUntilExpiry <= 0 ? "Expired" : r.daysUntilExpiry,
      LOT_STATUS_LABEL[r.status as LotStatus] ?? r.status,
    ]),
  );
}

function ExpiryReportContent() {
  const canView = useCan("inventory:reports:read");
  const searchParams = useSearchParams();
  const router = useRouter();

  const withinDaysParam = searchParams.get("withinDays") ?? "30";
  const statusParam = searchParams.get("status") ?? "";
  const warehouseParam = searchParams.get("warehouseId") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");

  const withinDays = Number(withinDaysParam);
  const currentPage = pageParam > 0 ? pageParam : 1;

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  const query = useExpiryReport({
    withinDays,
    status: statusParam || undefined,
    warehouseId: warehouseParam ? Number(warehouseParam) : undefined,
    page: currentPage,
    limit: LIMIT,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo(() => buildColumns(), []);

  function handleWithinDaysChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("withinDays", value);
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleStatusChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleWarehouseChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("warehouseId");
    } else {
      params.set("warehouseId", value);
    }
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleExportClick(): void {
    exportToCsv(items);
  }

  function handleGetRowKey(row: ExpiryReportRow): string | number {
    return row.id;
  }

  const hasData = !query.isLoading && !query.error;
  const isEmpty = hasData && total === 0;
  const hasRows = hasData && total > 0;

  if (!canView)
    return (
      <PageWrapper
        title="Expiry Report"
        subtitle="Lots approaching or past their expiry date within the selected window"
      >
        <NoPermissionState permission="inventory:reports:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Expiry Report"
      subtitle="Lots approaching or past their expiry date within the selected window"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={withinDaysParam} onValueChange={handleWithinDaysChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] min-w-0 text-xs shrink-0")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WITHIN_DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] min-w-0 text-xs shrink-0")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LOT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={warehouseParam || "all"} onValueChange={handleWarehouseChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[180px] min-w-0 text-xs shrink-0")}>
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AnimatedIconButton
            icon={DownloadIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="text-xs ml-auto shrink-0"
            onClick={handleExportClick}
            disabled={items.length === 0}
            aria-label="Export expiry report as CSV"
          >
            Export CSV
          </AnimatedIconButton>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {query.isLoading && <DataTableSkeleton rows={12} columns={7} />}
        {query.error && (
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        )}

        {isEmpty && (
          <InventoryEmptyState
            illustration={<EmptyReportIllustration />}
            title="No expiring lots"
            description="Lots with tracked expiry dates will appear here as they approach their expiry window."
          />
        )}

        {hasRows && (
          <DataTable
            data={items}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={handleGetRowKey}
            pagination={{
              mode: "server",
              page: currentPage,
              pageSize: LIMIT,
              total,
              onPageChange: handlePageChange,
            }}
            emptyState={
              <InventoryEmptyState
                illustration={<EmptySearchIllustration />}
                title="No results"
                description="No lots match the current filters."
              />
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}

export default function ExpiryReportPage() {
  return (
    <Suspense>
      <ExpiryReportContent />
    </Suspense>
  );
}
