"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import {
  useBatchableProposals,
  useCreatePoBatch,
  usePoBatchPreview,
  type BatchableProposal,
  type SupplierSiteBatch,
} from "@/hooks/api/inventory/replenishment-planning";
import { PoBatchPreviewPanel } from "./po-batch-preview-panel";
import { toneChipClass } from "./transfer-evidence-panel";

const READ_KEY = "inventory:replenishment:read";
const CREATE_KEY = "inventory:purchase-orders:create";
const PAGE_SIZE = 20;

function statusBadge(row: BatchableProposal) {
  if (row.duplicateOfPoNumber !== null) {
    return (
      <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-micro", toneChipClass("warning"))}>
        On {row.duplicateOfPoNumber}
      </Badge>
    );
  }
  if (row.blockedReason !== null) {
    return (
      <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-micro", toneChipClass("neutral"))}>
        Not orderable
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-micro", toneChipClass("success"))}>
      Ready
    </Badge>
  );
}

function buildColumns(): DataTableColumn<BatchableProposal>[] {
  return [
    {
      key: "product",
      header: "Item",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-dense font-medium" />
          <p className="font-mono text-dense text-muted-foreground">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Supplier",
      cell: (row) => (
        <div>
          <TruncatedText
            text={row.vendorName ?? "No supplier set"}
            className="text-dense"
          />
          <p className="text-micro text-muted-foreground">{row.currency ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Site",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.warehouseName ?? "Organisation"}
        </span>
      ),
    },
    {
      key: "reorderPoint",
      header: "Reorder point",
      className: "font-mono tabular-nums text-dense text-right text-muted-foreground",
      headerClassName: "text-right",
      cell: (row) => (row.reorderPoint === null ? "—" : formatQuantity(row.reorderPoint)),
    },
    {
      key: "suggestedQuantity",
      header: "Server quantity",
      className: "font-mono tabular-nums text-dense text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => formatQuantity(row.suggestedQuantity),
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      cell: (row) => statusBadge(row),
    },
  ];
}

/**
 * C6 — batching persisted proposals into purchase orders.
 *
 * Selecting rows previews what would be created, grouped by supplier, site and
 * currency; each group is one order and is created on its own. The quantity
 * column is the server's — this screen never sends one, and the API has no
 * field for it.
 */
export function PoBatchClient() {
  const canRead = useCan(READ_KEY);
  const canCreate = useCan(CREATE_KEY);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [pendingVendorId, setPendingVendorId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useBatchableProposals({
    page,
    limit: PAGE_SIZE,
  });
  const createBatch = useCreatePoBatch();

  const items = useMemo(() => data?.items ?? [], [data]);
  const selectedIds = useMemo(
    () =>
      items
        .filter((item) => selected.has(item.proposalId))
        .map((item) => item.proposalId),
    [items, selected],
  );

  const preview = usePoBatchPreview(selectedIds);

  function handleRetry(): void {
    void refetch();
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

    setPendingVendorId(batch.vendorId);
    createBatch.mutate(
      { proposalIds, vendorId: batch.vendorId },
      {
        onSuccess: (result) => {
          setPendingVendorId(null);
          setSelected(new Set());
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

  if (!canRead) {
    return (
      <PageWrapper title="Purchase-order batching">
        <NoPermissionState
          permission={READ_KEY}
          title="Batching is restricted"
          description="Reading replenishment proposals needs replenishment access. This list is not empty — it is closed to you."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const readyCount = items.filter((item) => item.blockedReason === null).length;
  const duplicateCount = items.filter((item) => item.duplicateOfPoNumber !== null).length;

  return (
    <PageWrapper
      title="Purchase-order batching"
      subtitle="One order per supplier, site and currency, from the forecasts already on record. The server recomputes every quantity."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the proposals"
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
                label="Already on a draft"
                value={duplicateCount}
                tone={duplicateCount > 0 ? "amber" : "default"}
                isLoading={isLoading}
                hint="Ordering again would double the delivery"
              />
            </StatCardGrid>

            <DataTable
              data={items}
              columns={buildColumns()}
              getRowKey={(row) => row.proposalId}
              isLoading={isLoading}
              minWidth="960px"
              className="shrink-0"
              selection={{
                selected,
                onChange: setSelected,
                isRowSelectable: (row) => row.blockedReason === null,
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
                  title="No persisted proposals yet"
                  description="A proposal appears here once a forecast has been recorded for a SKU at a site. Generate one from the forecasting screen."
                  compact
                />
              }
            />

            {selectedIds.length === 0 ? (
              <InventoryEmptyState
                illustrationPreset="inventory"
                title="Select proposals to batch"
                description="Choosing rows shows exactly which purchase orders would be created, and what each line would cost, before anything is written."
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
          </>
        )}
      </div>
    </PageWrapper>
  );
}
