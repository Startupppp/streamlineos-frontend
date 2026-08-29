"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import {
  useApproveTransferRecommendation,
  useTransferPlan,
  type TransferRecommendation,
} from "@/hooks/api/inventory/replenishment-planning";
import { TransferEvidencePanel } from "./transfer-evidence-panel";

const READ_KEY = "inventory:replenishment:read";
const APPROVE_KEY = "inventory:stock:transfer";

interface ApproveButtonProps {
  row: TransferRecommendation;
  isPending: boolean;
  canApprove: boolean;
  onApprove: (row: TransferRecommendation) => void;
}

function ApproveButton({ row, isPending, canApprove, onApprove }: ApproveButtonProps) {
  function handleClick(): void {
    onApprove(row);
  }

  if (!canApprove) return null;
  return (
    <LoadingButton
      size="sm"
      variant="outline"
      className="h-7 px-2 text-micro"
      isPending={isPending}
      onClick={handleClick}
    >
      Approve
    </LoadingButton>
  );
}

function coverAfterLabel(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} wk`;
}

function buildColumns(
  canApprove: boolean,
  pendingKey: string | null,
  onApprove: (row: TransferRecommendation) => void,
): DataTableColumn<TransferRecommendation>[] {
  return [
    {
      key: "from",
      header: "From",
      cell: (row) => (
        <div>
          <TruncatedText text={row.fromWarehouseName} className="text-dense font-medium" />
          <p className="text-micro text-muted-foreground">
            Cover after {coverAfterLabel(row.coverAfter.from)}
          </p>
        </div>
      ),
    },
    {
      key: "to",
      header: "To",
      cell: (row) => (
        <div>
          <TruncatedText text={row.toWarehouseName} className="text-dense font-medium" />
          <p className="text-micro text-muted-foreground">
            Cover after {coverAfterLabel(row.coverAfter.to)}
          </p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Move",
      className: "font-mono tabular-nums text-dense text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => formatQuantity(row.quantity),
    },
    {
      key: "rationale",
      header: "Why",
      cell: (row) => (
        <TruncatedText
          text={row.rationale}
          className="max-w-[420px] text-dense text-muted-foreground"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (row) => (
        <ApproveButton
          row={row}
          canApprove={canApprove}
          isPending={pendingKey === recommendationKey(row)}
          onApprove={onApprove}
        />
      ),
    },
  ];
}

function recommendationKey(row: TransferRecommendation): string {
  return `${row.fromWarehouseId}-${row.toWarehouseId}`;
}

/**
 * C5 — the transfer plan for one SKU, and approving a move from it.
 *
 * Approving sends the move, never the amount: the server re-derives the
 * quantity from the plan at approval time, so a screen that has been open all
 * afternoon cannot commit to a number the shelves no longer support. The
 * resulting transfer is PENDING and holds nothing — reserving is a separate
 * decision with its own permission.
 */
export function TransferRecommendationsClient() {
  const canRead = useCan(READ_KEY);
  const canApprove = useCan(APPROVE_KEY);
  const [variantId, setVariantId] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const productVariantId = variantId === "" ? null : Number(variantId);
  const { data, isLoading, isError, error, refetch } = useTransferPlan(productVariantId);
  const approve = useApproveTransferRecommendation();

  function handleRetry(): void {
    void refetch();
  }

  function handleApprove(row: TransferRecommendation): void {
    if (productVariantId === null) return;
    setPendingKey(recommendationKey(row));
    approve.mutate(
      {
        productVariantId,
        fromWarehouseId: row.fromWarehouseId,
        toWarehouseId: row.toWarehouseId,
      },
      {
        onSuccess: (result) => {
          setPendingKey(null);
          toast.success(
            result.created ? "Transfer created" : "Transfer already created",
            {
              description: `${result.referenceNumber} moves ${formatQuantity(result.quantity)} from ${row.fromWarehouseName} to ${row.toWarehouseName}. Nothing is reserved yet.`,
            },
          );
        },
        onError: (mutationError) => {
          setPendingKey(null);
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }

  if (!canRead) {
    return (
      <PageWrapper title="Transfer recommendations">
        <NoPermissionState
          permission={READ_KEY}
          title="Transfer planning is restricted"
          description="Reading the network position needs replenishment access. This plan is not empty — it is closed to you."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const recommendations = data?.recommendations ?? [];
  const positions = data?.positions ?? [];
  const shortSites = positions.filter(
    (p) => p.weeksOfCover !== null && p.weeksOfCover < 2,
  ).length;
  const totalUnits = recommendations.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <PageWrapper
      title="Transfer recommendations"
      subtitle="Where one site is short and another has genuine spare, measured in weeks of cover rather than units."
      filters={
        <ProductVariantCombobox
          value={variantId}
          onChange={setVariantId}
          placeholder="Choose a SKU to plan…"
          className="min-w-0 flex-1 lg:max-w-md"
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {productVariantId === null ? (
          <InventoryEmptyState
            illustrationPreset="inventory"
            title="Choose a SKU"
            description="The plan compares every site you can see for one item. Pick a SKU above to see where its stock is standing and where it is needed."
            className="flex-1 h-full"
          />
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the transfer plan"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <StatCardGrid cols={3}>
              <StatCard
                label="Sites"
                value={positions.length}
                isLoading={isLoading}
                hint="Warehouses you can see"
              />
              <StatCard
                label="Sites under 2 weeks"
                value={shortSites}
                tone={shortSites > 0 ? "amber" : "default"}
                isLoading={isLoading}
              />
              <StatCard
                label="Units recommended"
                value={totalUnits}
                tone={recommendations.length > 0 ? "emerald" : "default"}
                isLoading={isLoading}
              />
            </StatCardGrid>

            {!isLoading && recommendations.length === 0 ? (
              <InventoryEmptyState
                illustrationPreset="inventory"
                title="No move worth making"
                description="Either no site is short, or no site has spare stock to give without going short itself. The evidence for both is below."
                className="shrink-0"
                compact
              />
            ) : (
              <DataTable
                data={recommendations}
                columns={buildColumns(canApprove, pendingKey, handleApprove)}
                getRowKey={(row, index) => `${recommendationKey(row)}-${index}`}
                isLoading={isLoading}
                minWidth="880px"
                className="shrink-0"
                pagination={{
                  mode: "server",
                  page: 1,
                  pageSize: Math.max(recommendations.length, 1),
                  total: recommendations.length,
                  onPageChange: noop,
                }}
                emptyState={
                  <InventoryEmptyState
                    illustrationPreset="inventory"
                    title="No move worth making"
                    description="Nothing in this network is both short and coverable from elsewhere."
                    compact
                  />
                }
              />
            )}

            {!canApprove && recommendations.length > 0 && (
              <Badge variant="outline" className="w-fit px-2 py-0.5 text-micro">
                Approving a move needs stock-transfer access
              </Badge>
            )}

            {data && <TransferEvidencePanel plan={data} />}
          </>
        )}
      </div>
    </PageWrapper>
  );
}

/**
 * The plan is a whole-network answer for one SKU, not a page of a list — the
 * service returns every recommendation it will make. `DataTable` still wants a
 * real pagination object, so it is given the honest one.
 */
function noop(): void {
  return undefined;
}
