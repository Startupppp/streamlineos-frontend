"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn, DataTableSkeleton } from "@/components/ui/data-table";

import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useSlowMovingReport, type SlowMovingRow } from "@/hooks/api/inventory/reports";
import { downloadCsv } from "@/features/inventory/lib";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";

const DAYS_OPTIONS = [
  { value: "30", label: "Inactive >30 days" },
  { value: "60", label: "Inactive >60 days" },
  { value: "90", label: "Inactive >90 days" },
  { value: "180", label: "Inactive >180 days" },
  { value: "365", label: "Inactive >365 days" },
] as const;

const LIMIT = 50;

function daysInactiveClass(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days >= 180) return "text-status-danger-ink font-medium";
  if (days >= 90) return "text-status-warning-ink font-medium";
  return "";
}

function buildColumns(): DataTableColumn<SlowMovingRow>[] {
  return [
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span className="font-medium">{row.productName}</span>,
    },
    {
      key: "variantSku",
      header: "SKU",
      cell: (row) => <span className="font-mono tabular-nums text-dense">{row.variantSku}</span>,
    },
    {
      key: "onHand",
      header: "On Hand",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <span className="font-mono tabular-nums">{row.onHand}</span>,
    },
    {
      key: "value",
      header: "Value",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums">${row.value.toFixed(2)}</span>
      ),
    },
    {
      key: "lastMovement",
      header: "Last Movement",
      cell: (row) => (
        <span className="text-muted-foreground text-dense">
          {formatShortDate(row.lastMovement) || "Never"}
        </span>
      ),
    },
    {
      key: "daysSinceLastMovement",
      header: "Days Inactive",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className={`font-mono tabular-nums ${daysInactiveClass(row.daysSinceLastMovement)}`}>
          {row.daysSinceLastMovement ?? "Never moved"}
        </span>
      ),
    },
  ];
}

function exportToCsv(rows: SlowMovingRow[]): void {
  downloadCsv(
    `slow-moving-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Product", "SKU", "On Hand", "Avg Cost", "Value", "Last Movement", "Days Inactive"],
    rows.map((r) => [
      r.productName,
      r.variantSku,
      r.onHand,
      r.averageCost.toFixed(2),
      r.value.toFixed(2),
      formatShortDate(r.lastMovement) || "Never",
      r.daysSinceLastMovement ?? "Never moved",
    ]),
  );
}

function SlowMovingReportContent() {
  const canView = useCan("inventory:reports:read");
  const searchParams = useSearchParams();
  const router = useRouter();

  const daysParam = searchParams.get("days") ?? "60";
  const pageParam = Number(searchParams.get("page") ?? "1");

  const days = Number(daysParam);
  const currentPage = pageParam > 0 ? pageParam : 1;

  const query = useSlowMovingReport({ days, page: currentPage, limit: LIMIT });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo(() => buildColumns(), []);

  function handleDaysChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", value);
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

  function handleGetRowKey(row: SlowMovingRow): string | number {
    return row.productVariantId;
  }

  const hasData = !query.isLoading && !query.error;
  const isEmpty = hasData && total === 0;
  const hasRows = hasData && total > 0;

  if (!canView)
    return (
      <PageWrapper
        title="Slow-Moving Inventory"
        subtitle="Products with stock on hand but no outbound activity within the selected window"
      >
        <NoPermissionState permission="inventory:reports:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Slow-Moving Inventory"
      subtitle="Products with stock on hand but no outbound activity within the selected window"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={daysParam} onValueChange={handleDaysChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[180px] min-w-0 text-xs shrink-0")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
            aria-label="Export slow-moving report as CSV"
          >
            Export CSV
          </AnimatedIconButton>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {query.isLoading && <DataTableSkeleton rows={12} columns={6} />}
        {query.error && (
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        )}

        {isEmpty && (
          <InventoryEmptyState
            illustration={<EmptyReportIllustration />}
            title="No slow-moving inventory"
            description="Products appear here when they have stock on hand but no sales or outbound transfers within the selected window."
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
                  description="No products match the current filter."
                />
              }
            />
        )}
      </div>
    </PageWrapper>
  );
}

export default function SlowMovingReportPage() {
  return (
    <Suspense>
      <SlowMovingReportContent />
    </Suspense>
  );
}
