"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings2, ClipboardList } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { PoBatchPreviewPanel } from "@/features/inventory/components/replenishment/po-batch-preview-panel";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useBatchableProposals,
  useCreatePoBatch,
  usePoBatchPreview,
  useRefreshProposals,
  type BatchableProposal,
  type ProposalOverrideInput,
  type SupplierSiteBatch,
} from "@/hooks/api/inventory/replenishment-planning";
import { useInventoryInsights } from "@/hooks/api/inventory/ai";
import { ForecastProposalSheet } from "./forecast-proposal-sheet";
import { SupplierDelayBriefing } from "./supplier-delay-briefing";
import { ProposalOverrideDialog } from "./proposal-override-dialog";
import {
  buildProposalColumns,
  toOverridable,
} from "./replenishment-proposal-columns";

const READ_KEY = "inventory:replenishment:read";
const CREATE_KEY = "inventory:purchase-orders:create";
const MANAGE_KEY = "inventory:replenishment:manage";
const PAGE_SIZE = 20;
/** Sentinel: choosing it removes the filter rather than sending "all" (§9). */
const ALL_WAREHOUSES = "all";

/**
 * C2 — the replenishment screen reviews forecasts that were actually recorded.
 *
 * It used to read `GET /inventory/replenishment/suggestions`, a min/max rule
 * breach computed per request, and post the quantity it had been handed back —
 * so the number on a purchase order originated at the client and the persisted
 * forecast engine was decoration. Every row here is now an
 * `inv_demand_forecasts` row, the quantity column is the server's own, and
 * approving sends proposal ids and nothing that could be mistaken for a
 * quantity.
 *
 * A buyer who knows better is not locked out; they are asked to say so. An
 * override names its proposal, carries a reason and is recorded beside the
 * order, and the engine's own figure stays on the row next to it — struck
 * through rather than deleted, so the two numbers are never confused for one.
 *
 * Min/max rules keep their own screen (Manage rules) and their own report; what
 * they no longer do is decide what a purchase order says.
 */
export function ReplenishmentClient() {
  const canRead = useCan(READ_KEY);
  const canCreate = useCan(CREATE_KEY);
  const canRecord = useCan(MANAGE_KEY);

  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>(ALL_WAREHOUSES);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [overrides, setOverrides] = useState<ReadonlyMap<number, ProposalOverrideInput>>(
    new Map(),
  );
  const [overrideTarget, setOverrideTarget] = useState<BatchableProposal | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [evidenceRow, setEvidenceRow] = useState<BatchableProposal | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [pendingVendorId, setPendingVendorId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useBatchableProposals({
    page,
    limit: PAGE_SIZE,
    ...(warehouseId === ALL_WAREHOUSES ? {} : { warehouseId: Number(warehouseId) }),
  });
  const { data: warehouses } = useWarehouses({ status: "active" });
  const createBatch = useCreatePoBatch();
  const refreshProposals = useRefreshProposals();
  const { data: insightsData } = useInventoryInsights({ type: "vendor_delay", limit: 1 });

  const items = useMemo(() => data?.items ?? [], [data]);
  const selectedIds = useMemo(
    () => items.filter((item) => selected.has(item.proposalId)).map((item) => item.proposalId),
    [items, selected],
  );
  const selectedOverrides = useMemo(
    () =>
      selectedIds.flatMap((id) => {
        const override = overrides.get(id);
        return override ? [override] : [];
      }),
    [selectedIds, overrides],
  );

  const preview = usePoBatchPreview(selectedIds, selectedOverrides);

  const handleOpenEvidence = useCallback((row: BatchableProposal) => {
    setEvidenceRow(row);
    setEvidenceOpen(true);
  }, []);

  const handleOpenOverride = useCallback((row: BatchableProposal) => {
    setOverrideTarget(row);
    setOverrideOpen(true);
  }, []);

  const handleSaveOverride = useCallback((override: ProposalOverrideInput) => {
    setOverrides((previous) => new Map(previous).set(override.proposalId, override));
    setSelected((previous) => new Set(previous).add(override.proposalId));
  }, []);

  const handleClearOverride = useCallback((proposalId: number) => {
    setOverrides((previous) => {
      const next = new Map(previous);
      next.delete(proposalId);
      return next;
    });
  }, []);

  function handleRetry(): void {
    void refetch();
  }

  function handleRecordProposals(): void {
    refreshProposals.mutate(
      warehouseId === ALL_WAREHOUSES ? {} : { warehouseId: Number(warehouseId) },
      {
        onSuccess: (result) => {
          setPage(1);
          toast.success(
            result.recorded > 0
              ? `Recorded ${result.recorded} new proposal${result.recorded === 1 ? "" : "s"}`
              : "Every proposal is already up to date",
            {
              description:
                `${result.scanned} SKU${result.scanned === 1 ? "" : "s"} with recent demand were forecast; ${result.unchanged} were unchanged` +
                (result.failed.length > 0
                  ? `, ${result.failed.length} could not be forecast.`
                  : "."),
            },
          );
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value);
    setPage(1);
    // A selection made against one site's proposals means nothing against
    // another's, and an override carries a proposal id that is about to leave
    // the list — so both are dropped rather than silently carried across.
    setSelected(new Set());
    setOverrides(new Map());
  }

  function handleCreate(batch: SupplierSiteBatch): void {
    const proposalIds = items
      .filter(
        (item) =>
          selected.has(item.proposalId) &&
          item.vendorId === batch.vendorId &&
          item.warehouseId === batch.warehouseId &&
          item.currency === batch.currency,
      )
      .map((item) => item.proposalId);
    if (proposalIds.length === 0) return;

    const batchOverrides = proposalIds.flatMap((id) => {
      const override = overrides.get(id);
      return override ? [override] : [];
    });

    setPendingVendorId(batch.vendorId);
    createBatch.mutate(
      { proposalIds, vendorId: batch.vendorId, overrides: batchOverrides },
      {
        onSuccess: (result) => {
          setPendingVendorId(null);
          setSelected(new Set());
          setOverrides(new Map());
          toast.success(
            result.created ? "Draft purchase order created" : "Draft already created",
            {
              description: `${result.poNumber} carries ${result.lineCount} line${result.lineCount === 1 ? "" : "s"}. ${result.nextStep}`,
            },
          );
        },
        onError: (mutationError) => {
          setPendingVendorId(null);
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }

  const columns = buildProposalColumns({
    overrides,
    canOverride: canCreate,
    onOpenProposal: handleOpenEvidence,
    onOverride: handleOpenOverride,
    onClearOverride: handleClearOverride,
  });

  const readyCount = items.filter((item) => item.blockedReason === null).length;
  const overrideCount = overrides.size;
  const hasVendorDelayInsights = (insightsData?.total ?? 0) > 0;

  if (!canRead) {
    return (
      <PageWrapper title="Replenishment">
        <NoPermissionState
          permission={READ_KEY}
          title="Replenishment is restricted"
          description="Reading recorded forecast proposals needs replenishment access. This list is not empty — it is closed to you."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Replenishment"
      subtitle="Forecasts already on record, priced and sized by the server. Approving sends the proposal, never a quantity."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={warehouseId} onValueChange={handleWarehouseChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-fit min-w-[180px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value={ALL_WAREHOUSES}>All warehouses</SelectItem>
              {(warehouses ?? []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {canRecord && (
            <LoadingButton
              size="sm"
              isPending={refreshProposals.isPending}
              loadingText="Recording…"
              onClick={handleRecordProposals}
            >
              Record proposals
            </LoadingButton>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/reports/reorder">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Reorder Report
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/replenishment/rules">
              <Settings2 className="h-4 w-4 mr-1.5" />
              Manage Rules
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the recorded proposals"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <StatCardGrid cols={3}>
              <StatCard
                label="Proposals on record"
                value={data?.total ?? 0}
                isLoading={isLoading}
              />
              <StatCard
                label="Ready to order"
                value={readyCount}
                tone={readyCount > 0 ? "emerald" : "default"}
                isLoading={isLoading}
              />
              <StatCard
                label="Overridden"
                value={overrideCount}
                tone={overrideCount > 0 ? "amber" : "default"}
                isLoading={isLoading}
                hint="Quantities a person changed, with a recorded reason"
              />
            </StatCardGrid>

            <DataTable
              data={items}
              columns={columns}
              getRowKey={(row) => row.proposalId}
              isLoading={isLoading}
              minWidth="1040px"
              className="shrink-0"
              selection={{
                selected,
                onChange: setSelected,
                isRowSelectable: (row) =>
                  row.blockedReason === null || overrides.has(row.proposalId),
              }}
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total: data?.total ?? 0,
                onPageChange: setPage,
              }}
              emptyState={
                <InventoryEmptyState
                  illustrationPreset="inventory"
                  title="No recorded proposals yet"
                  description="A proposal appears here once a forecast has been recorded for a SKU at this site. Record proposals asks the engine to forecast everything that has sold in the last year."
                  compact
                />
              }
            />

            {selectedIds.length === 0 ? (
              <InventoryEmptyState
                illustrationPreset="inventory"
                title="Select proposals to order"
                description="Choosing rows shows exactly which purchase orders would be created, what each line would cost, and which quantities came from a person rather than the engine."
                className="shrink-0"
                compact
              />
            ) : (
              <PoBatchPreviewPanel
                preview={preview.data}
                isLoading={preview.isLoading}
                canCreate={canCreate}
                pendingVendorId={pendingVendorId}
                onCreate={handleCreate}
              />
            )}

            {!canCreate && selectedIds.length > 0 && (
              <Badge variant="outline" className="w-fit px-2 py-0.5 text-micro">
                Raising a purchase order needs purchase-order create access
              </Badge>
            )}

            {hasVendorDelayInsights && <SupplierDelayBriefing />}
          </>
        )}
      </div>

      <ForecastProposalSheet
        key={evidenceRow?.proposalId ?? "none"}
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        proposal={evidenceRow}
        override={evidenceRow ? (overrides.get(evidenceRow.proposalId) ?? null) : null}
      />

      <ProposalOverrideDialog
        key={overrideTarget?.proposalId ?? "none"}
        proposal={overrideTarget ? toOverridable(overrideTarget) : null}
        existing={overrideTarget ? (overrides.get(overrideTarget.proposalId) ?? null) : null}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        onSave={handleSaveOverride}
      />
    </PageWrapper>
  );
}
