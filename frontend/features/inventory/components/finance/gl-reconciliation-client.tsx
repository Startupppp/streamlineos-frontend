"use client";

import { useState } from "react";
import { BookX, CheckCircle2, FileWarning, Scale } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoneyCompact } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  GL_RECON_STATUSES,
  useGlReconPeriods,
  useGlReconciliation,
  type GlReconStatus,
} from "@/hooks/api/inventory/gl-reconciliation";
import { GL_RECON_COLUMNS, GL_RECON_STATUS_LABEL } from "./gl-reconciliation-columns";
import { GlReconciliationNotes } from "./gl-reconciliation-notes";

const ALL = "__all__";

/**
 * Stock movements against the journal entries they should have produced.
 *
 * The one report in the module that can say "this goods receipt moved stock and
 * no money followed it". It was mounted on the backend and called from nowhere,
 * so an accounting-enabled tenant had no way to see an unposted movement at all.
 */
export function GlReconciliationClient() {
  const canView = useCan("inventory:reports:read");
  const money = useOrgDisplay();

  const [periodId, setPeriodId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<GlReconStatus | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: warehouses = [] } = useWarehouses();
  const { data: periods } = useGlReconPeriods();
  const { data, isLoading, isError, error, refetch } = useGlReconciliation({
    periodId,
    status,
    warehouseId,
    page,
    limit: pageSize,
  });

  const summary = data?.summary;
  const filtersActive = periodId !== undefined || status !== undefined || warehouseId !== undefined;

  function handlePeriodChange(next: string): void {
    setPeriodId(next === ALL ? undefined : Number(next));
    setPage(1);
  }

  function handleStatusChange(next: string): void {
    setStatus(next === ALL ? undefined : (next as GlReconStatus));
    setPage(1);
  }

  function handleWarehouseChange(next: string): void {
    setWarehouseId(next === ALL ? undefined : Number(next));
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  if (!canView) {
    return (
      <PageWrapper title="GL reconciliation">
        <NoPermissionState permission="inventory:reports:read" className="flex-1" />
      </PageWrapper>
    );
  }

  const windowLabel =
    data === undefined
      ? "Loading the window…"
      : `${formatShortDate(data.window.fromDate)} – ${formatShortDate(data.window.toDate)}`;

  return (
    <PageWrapper
      title="GL reconciliation"
      subtitle={`Inventory movements against the journal entries they should have produced. ${windowLabel}`}
      backHref="/inventory/reconciliation"
      backLabel="Back to Stock Reconciliation"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select
            value={periodId === undefined ? ALL : String(periodId)}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-52")} aria-label="Accounting period">
              <SelectValue placeholder="This month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>This month</SelectItem>
              {(periods?.items ?? []).map((period) => (
                <SelectItem key={period.periodId} value={String(period.periodId)}>
                  {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status ?? ALL} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-52")} aria-label="Filter by reconciliation status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {GL_RECON_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {GL_RECON_STATUS_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={warehouseId === undefined ? ALL : String(warehouseId)}
            onValueChange={handleWarehouseChange}
          >
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-48")} aria-label="Filter by warehouse">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All warehouses</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <StatCardGrid cols={4}>
          <StatCard
            label="Movement value"
            value={summary ? formatMoneyCompact(Number(summary.movementValue), money) : "—"}
            icon={Scale}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Journal value"
            value={summary ? formatMoneyCompact(Number(summary.journalValue), money) : "—"}
            icon={CheckCircle2}
            tone="default"
            isLoading={isLoading}
          />
          <StatCard
            label="Unreconciled"
            value={summary ? formatMoneyCompact(Number(summary.unreconciledValue), money) : "—"}
            icon={FileWarning}
            tone={summary && Number(summary.unreconciledValue) !== 0 ? "red" : "emerald"}
            isLoading={isLoading}
            hint="Movement value with no matching journal"
          />
          <StatCard
            label="Without a journal"
            value={summary ? String(summary.unmatched + summary.missingCoa) : "—"}
            icon={BookX}
            tone={summary && summary.unmatched + summary.missingCoa > 0 ? "amber" : "emerald"}
            isLoading={isLoading}
            hint="Unposted, plus those whose account is not mapped"
          />
        </StatCardGrid>

        <GlReconciliationNotes report={data} />

        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't run the GL reconciliation"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={data?.items ?? []}
            columns={GL_RECON_COLUMNS}
            getRowKey={(row) => `${row.sourceType}:${row.sourceId}:${row.sourceEvent}`}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            minWidth="1120px"
            emptyState={
              filtersActive ? (
                <InventoryEmptyState
                  illustrationPreset="report"
                  title="No results match your filters"
                  description="No movement in this window matches the period, status and warehouse you picked."
                  compact
                />
              ) : (
                <InventoryEmptyState
                  illustrationPreset="report"
                  title="Nothing moved in this window"
                  description="No inventory movement was posted in the selected period, so there is nothing to reconcile against the journals."
                  compact
                />
              )
            }
            pagination={{
              mode: "server",
              page,
              pageSize,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
