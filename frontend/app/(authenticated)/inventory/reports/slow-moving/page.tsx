"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useSlowMovingReport, type SlowMovingRow } from "@/hooks/api/inventory/reports";
import { downloadCsv } from "@/features/inventory/lib";

const DAYS_OPTIONS = [
  { value: "30", label: "Inactive >30 days" },
  { value: "60", label: "Inactive >60 days" },
  { value: "90", label: "Inactive >90 days" },
  { value: "180", label: "Inactive >180 days" },
  { value: "365", label: "Inactive >365 days" },
] as const;

const LIMIT = 50;

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function daysInactiveClass(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days >= 180) return "text-red-700 font-medium";
  if (days >= 90) return "text-amber-600 font-medium";
  return "";
}

function buildColumns(): DataTableColumn<SlowMovingRow>[] {
  return [
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span className="font-medium">{row.productName}</span>,
      sortable: true,
      sortValue: (row) => row.productName,
    },
    {
      key: "variantSku",
      header: "SKU",
      cell: (row) => <span className="font-mono tabular-nums text-[11px]">{row.variantSku}</span>,
    },
    {
      key: "onHand",
      header: "On Hand",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <span className="font-mono tabular-nums">{row.onHand}</span>,
      sortable: true,
      sortValue: (row) => row.onHand,
    },
    {
      key: "value",
      header: "Value",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums">${row.value.toFixed(2)}</span>
      ),
      sortable: true,
      sortValue: (row) => row.value,
    },
    {
      key: "lastMovement",
      header: "Last Movement",
      cell: (row) => (
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.lastMovement)}
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
      sortable: true,
      sortValue: (row) => row.daysSinceLastMovement ?? 99999,
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
      formatDate(r.lastMovement),
      r.daysSinceLastMovement ?? "Never moved",
    ]),
  );
}

function SlowMovingReportContent() {
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

  return (
    <PageWrapper
      title="Slow-Moving Inventory"
      subtitle="Products with stock on hand but no outbound activity within the selected window"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={daysParam} onValueChange={handleDaysChange}>
            <SelectTrigger className="w-[180px] min-w-0 text-xs shrink-0">
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
      {query.isLoading && <DataTableSkeleton rows={12} columns={6} />}
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} className="flex-1" />
      )}

      {isEmpty && (
        <InventoryEmptyState
          illustration={<EmptyReportIllustration />}
          title="No slow-moving inventory"
          description="Products appear here when they have stock on hand but no sales or outbound transfers within the selected window."
        />
      )}

      {hasRows && (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={items}
              columns={columns}
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
          </CardContent>
        </Card>
      )}
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
