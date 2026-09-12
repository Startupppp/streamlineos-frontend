"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  useReconciliationReport,
  useRepairProjection,
  type ReconciliationCheck,
  type ReconciliationDriftRow,
} from "@/hooks/api/inventory/reconciliation";

const SENTINEL = "__all__";

const CHECK_LABEL: Record<ReconciliationCheck, string> = {
  projection_vs_ledger: "Projection vs ledger",
  committed_vs_reservations: "Committed vs reservations",
  ledger_arithmetic: "Ledger arithmetic",
  orphan_projection: "Orphan projection",
};

/**
 * Arithmetic drift and orphans are the serious pair — a CHECK constraint makes
 * the first unrepresentable, so a row means the constraint is gone or predates
 * it, and the second is stock no movement accounts for.
 */
const CHECK_TONE: Record<ReconciliationCheck, "warning" | "info" | "danger"> = {
  projection_vs_ledger: "warning",
  committed_vs_reservations: "info",
  ledger_arithmetic: "danger",
  orphan_projection: "danger",
};

function renderCheckCell(row: ReconciliationDriftRow) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-dense font-medium",
        statusToneClasses(CHECK_TONE[row.check]),
      )}
    >
      {CHECK_LABEL[row.check]}
    </span>
  );
}

function renderGrainCell(row: ReconciliationDriftRow) {
  const parts = [
    `variant ${String(row.productVariantId)}`,
    row.locationId !== null ? `loc ${String(row.locationId)}` : null,
    row.lotId !== null ? `lot ${String(row.lotId)}` : null,
    row.serialId !== null ? `serial ${String(row.serialId)}` : null,
  ].filter(Boolean);
  return <span className="font-mono text-dense text-muted-foreground">{parts.join(" · ")}</span>;
}

function renderFieldCell(row: ReconciliationDriftRow) {
  return <span className="font-mono text-dense">{row.field}</span>;
}

function renderProjectedCell(row: ReconciliationDriftRow) {
  return <span className="font-mono tabular-nums">{row.projected}</span>;
}

function renderExpectedCell(row: ReconciliationDriftRow) {
  return <span className="font-mono tabular-nums">{row.expected}</span>;
}

function renderDifferenceCell(row: ReconciliationDriftRow) {
  return <span className="font-mono tabular-nums font-semibold">{row.difference}</span>;
}

const DRIFT_COLUMNS: DataTableColumn<ReconciliationDriftRow>[] = [
  { key: "check", header: "Check", cell: renderCheckCell },
  { key: "grain", header: "Grain", cell: renderGrainCell },
  { key: "field", header: "Field", cell: renderFieldCell },
  {
    key: "projected",
    header: "Projected",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderProjectedCell,
  },
  {
    key: "expected",
    header: "Expected",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderExpectedCell,
  },
  {
    key: "difference",
    header: "Difference",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderDifferenceCell,
  },
];

export function ReconciliationClient() {
  const canReconcile = useCan("inventory:stock:reconcile");
  const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: warehouses = [] } = useWarehouses();
  const { data, isLoading, isError, error, refetch, isFetching } = useReconciliationReport({
    warehouseId: warehouseFilter,
  });
  const repair = useRepairProjection();

  const drift = data?.drift ?? [];

  function handleWarehouseChange(value: string): void {
    setWarehouseFilter(value === SENTINEL ? undefined : Number(value));
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleRepairClick(): void {
    setConfirmOpen(true);
  }

  function handleRepairConfirm(reason: string): void {
    repair.mutate(
      { reason, warehouseId: warehouseFilter },
      {
        onSuccess: (result) => {
          toast.success(
            result.rowsChanged === 0
              ? "Nothing to rebuild — the projection already matches the ledger."
              : `Rebuilt ${String(result.rowsChanged)} stock ${result.rowsChanged === 1 ? "row" : "rows"} from the ledger.`,
          );
          setConfirmOpen(false);
          void refetch();
        },
        onError: (mutationError) => {
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }

  if (!canReconcile) {
    // G8. This said "Access restricted" through the *empty* component, with the
    // same illustration and layout the screen shows when reconciliation finds no
    // drift. Denied and empty are different answers; `NoPermissionState` says so
    // and names the key the reader needs to ask for.
    return (
      <PageWrapper title="Stock Reconciliation">
        <NoPermissionState permission="inventory:stock:reconcile" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Stock Reconciliation"
        subtitle="Compares the stock projection against the movements it is derived from."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* The animated set has no refresh glyph, so this stays static. */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={handleRetry}
              disabled={isFetching}
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {isFetching ? "Checking…" : "Re-check"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={handleRepairClick}
              disabled={repair.isPending || drift.length === 0}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Rebuild from ledger
            </Button>
          </div>
        }
        filters={
          <Select
            value={warehouseFilter ? String(warehouseFilter) : SENTINEL}
            onValueChange={handleWarehouseChange}
          >
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-48 text-sm")}>
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SENTINEL}>All warehouses</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <StatCardGrid cols={3}>
            <StatCard
              label="Differences found"
              value={isLoading ? "—" : String(data?.driftCount ?? 0)}
              icon={data && data.driftCount > 0 ? ShieldAlert : CheckCircle2}
              tone={data && data.driftCount > 0 ? "red" : "emerald"}
              isLoading={isLoading}
              hint={data?.truncated ? "More differences exist than are shown" : undefined}
            />
            <StatCard
              label="Checks run"
              value={isLoading ? "—" : String(data?.checked.length ?? 0)}
              icon={CheckCircle2}
              tone="blue"
              isLoading={isLoading}
            />
            <StatCard
              label="Taken at"
              value={isLoading || !data ? "—" : format(new Date(data.generatedAt), "dd MMM, HH:mm")}
              icon={RefreshCcw}
              tone="default"
              isLoading={isLoading}
              hint="A point-in-time comparison against a moving ledger"
            />
          </StatCardGrid>

          {data && data.unreconcilable.length > 0 ? (
            <div className="shrink-0 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold">Not checked by this report</p>
              <ul className="mt-1 space-y-0.5">
                {data.unreconcilable.map((note) => (
                  <li key={note} className="text-dense text-muted-foreground">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't run the reconciliation"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={drift}
              columns={DRIFT_COLUMNS}
              getRowKey={(row, index) => `${row.check}:${row.field}:${String(index)}`}
              isLoading={isLoading}
              className="flex-1 min-h-0"
              minWidth="820px"
              emptyState={
                <InventoryEmptyState
                  illustrationPreset="inventory"
                  title="Everything reconciles"
                  description="Every checked figure matches the movements it is derived from."
                  compact
                />
              }
            />
          )}
        </div>
      </PageWrapper>

      <ConfirmWithReasonSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Rebuild the projection from the ledger"
        description="This overwrites on-hand, blocked and quality-hold quantities with the sums of the recorded movements. It changes no movement, and leaves on-order and outgoing quantities alone because the ledger does not describe them."
        reasonLabel="Reason"
        reasonPlaceholder="Why this rebuild is being run"
        reasonRequired
        confirmLabel="Rebuild"
        isPending={repair.isPending}
        onConfirm={handleRepairConfirm}
      />
    </>
  );
}
