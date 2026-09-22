"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useApplyLandedCostVoucher,
  useLandedCostVoucher,
  type LandedCostAllocation,
  type LandedCostCharge,
} from "@/hooks/api/inventory/landed-cost";
import { useCanState } from "@/hooks/api/access";
import { fromMinorUnits } from "./landed-cost-schema";
import { LandedCostAddChargeDialog } from "./landed-cost-add-charge-dialog";

const CHARGE_COLUMNS: DataTableColumn<LandedCostCharge>[] = [
  {
    key: "chargeType",
    header: "Type",
    cell: (row) => (
      <Badge variant="outline" className="h-5 px-2 py-0.5 text-dense">
        {row.chargeType}
      </Badge>
    ),
  },
  { key: "description", header: "Description", cell: (row) => row.description },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => fromMinorUnits(row.amountCents),
  },
];

const ALLOCATION_COLUMNS: DataTableColumn<LandedCostAllocation>[] = [
  {
    key: "layerQuantity",
    header: "Layer qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.layerQuantity,
  },
  {
    key: "unitCostBefore",
    header: "Unit cost before",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.unitCostBefore,
  },
  {
    key: "unitCostAfter",
    header: "Unit cost after",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) => row.unitCostAfter,
  },
  {
    key: "capitalisedValue",
    header: "Capitalised",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.capitalisedValue,
  },
  {
    key: "expensedValue",
    header: "Expensed",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.expensedValue,
  },
];

/**
 * One voucher, its charges, and — once applied — where every fraction went.
 *
 * The allocation table is the evidence half: applying a voucher restates unit
 * cost on each layer, and without a before/after a person is asked to trust a
 * number that changed underneath them.
 */
export function LandedCostDetailSheet({
  voucherId,
  canManage,
  onOpenChange,
}: {
  voucherId: number | null;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const valuationState = useCanState("inventory:valuation:read");
  const [addingCharge, setAddingCharge] = useState(false);
  const { data, isPending, isError, error, refetch } =
    useLandedCostVoucher(voucherId);
  const apply = useApplyLandedCostVoucher();

  /*
   * `addCharge` refuses a voucher that is no longer DRAFT with a 409 — applying
   * one restates the cost layers, and a charge arriving afterwards belongs on a
   * second voucher, not retrospectively on this one. So the control is offered
   * on exactly the states the handler accepts.
   */
  const canAddCharge = canManage && data?.status === "DRAFT";

  function handleAddChargeOpen(): void {
    setAddingCharge(true);
  }

  function handleApply(): void {
    if (voucherId === null) return;
    apply.mutate(voucherId, {
      onSuccess: (result) => {
        toast.success(
          `Applied — ${String(result.layersRevalued)} cost ${result.layersRevalued === 1 ? "layer" : "layers"} revalued.`,
        );
      },
      onError: (applyError) => toast.error(getErrorMessage(applyError)),
    });
  }

  return (
    <>
      <AppSheet
        open={voucherId !== null}
        onOpenChange={onOpenChange}
        title={data?.voucherNumber ?? "Landed-cost voucher"}
        description="Freight, duty, insurance and handling landed into the cost of one receipt."
        className="sm:max-w-2xl"
        footer={
          data && data.status === "DRAFT" && canManage ? (
            <LoadingButton
              isPending={apply.isPending}
              loadingText="Applying…"
              onClick={handleApply}
              className="w-full"
            >
              Apply to cost layers
            </LoadingButton>
          ) : null
        }
      >
        {valuationState === "denied" ? (
          <NoPermissionState compact permission="inventory:valuation:read" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load the voucher"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : isPending || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div>
                <dt className="text-dense text-muted-foreground">Status</dt>
                <dd className="text-sm font-medium">
                  {data.status === "APPLIED" ? "Applied" : "Draft"}
                </dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">Spread by</dt>
                <dd className="text-sm">
                  {data.allocationBasis === "VALUE"
                    ? "Layer value"
                    : "Layer quantity"}
                </dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">
                  Charges total
                </dt>
                <dd className="font-mono tabular-nums text-sm">
                  {data.currency} {fromMinorUnits(data.chargeTotalCents)}
                </dd>
              </div>
              <div>
                <dt className="text-dense text-muted-foreground">
                  Capitalised / expensed
                </dt>
                <dd className="font-mono tabular-nums text-sm">
                  {data.capitalisedValue ?? "—"} / {data.expensedValue ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Charges</p>
                {canAddCharge ? (
                  <AnimatedIconButton
                    icon={PlusIcon}
                    iconSize={16}
                    iconClassName="mr-1.5"
                    variant="outline"
                    size="sm"
                    onClick={handleAddChargeOpen}
                  >
                    Add charge
                  </AnimatedIconButton>
                ) : null}
              </div>
              <DataTable
                data={data.charges}
                columns={CHARGE_COLUMNS}
                getRowKey={(row) => row.id}
                emptyState={
                  <InventoryEmptyState
                    illustrationPreset="default"
                    title="No charges"
                    description="A voucher with no charge has nothing to land."
                    compact
                  />
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Where it went</p>
              <DataTable
                data={data.allocations}
                columns={ALLOCATION_COLUMNS}
                getRowKey={(row) => row.valuationLayerId}
                emptyState={
                  <InventoryEmptyState
                    illustrationPreset="default"
                    title="Not applied yet"
                    description="Allocations are worked out when the voucher is applied. Until then the cost layers are untouched."
                    compact
                  />
                }
              />
            </div>
          </div>
        )}
      </AppSheet>

      {/*
        A sibling of the sheet, not a child of it, for the reason
        `pick-wave-sheet.tsx` gives: Radix traps focus inside each of them, and
        a dialog mounted within the sheet's own subtree has the sheet competing
        to pull focus back the moment it opens.
      */}
      <LandedCostAddChargeDialog
        open={addingCharge}
        onOpenChange={setAddingCharge}
        voucherId={voucherId}
        voucherNumber={data?.voucherNumber}
      />
    </>
  );
}
