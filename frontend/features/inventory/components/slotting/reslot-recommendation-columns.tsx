"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { SlottingRecommendation } from "@/hooks/api/inventory/slotting-labor";
import { LocationNameCell, ResolvedName } from "./slotting-name-cells";
import { ReslotApproveControl } from "./reslot-approve-control";
import type { NameSource } from "./slotting-rule-columns";

interface ReslotColumnsOptions {
  canMove: boolean;
  canDismiss: boolean;
  locationsReadable: boolean;
  variants: NameSource;
  isApproving: boolean;
  onApprove: (recommendation: SlottingRecommendation, toLocationId: number) => void;
  onDismiss: (recommendationId: number) => void;
}

/**
 * The re-slot queue.
 *
 * Every one of its first three columns printed a raw id — `#40`, `#7`,
 * `Zone #12` — which is the §5 violation the rules table had, on a surface where
 * it mattered more: this is the table where somebody decides whether it is worth
 * a walk, and "move #40 from #7" is not a decision anybody can make.
 */
export function buildReslotRecommendationColumns({
  canMove,
  canDismiss,
  locationsReadable,
  variants,
  isApproving,
  onApprove,
  onDismiss,
}: ReslotColumnsOptions): DataTableColumn<SlottingRecommendation>[] {
  return [
    {
      key: "variant",
      header: "Variant",
      cell: (row) => (
        <span className="text-sm">
          {variants.canRead ? (
            <ResolvedName
              name={variants.names.get(row.productVariantId)}
              isLoading={variants.isLoading}
              missing="No longer in the catalogue"
            />
          ) : (
            <span className="italic text-muted-foreground">{variants.deniedNote}</span>
          )}
        </span>
      ),
    },
    {
      key: "from",
      header: "Standing at",
      cell: (row) => (
        <LocationNameCell
          warehouseId={row.warehouseId}
          locationId={row.fromLocationId}
          canRead={locationsReadable}
          className="text-sm"
        />
      ),
    },
    {
      key: "to",
      header: "Belongs in",
      cell: (row) => (
        <LocationNameCell
          warehouseId={row.warehouseId}
          locationId={row.toZoneLocationId}
          canRead={locationsReadable}
          className="text-sm"
        />
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    { key: "reason", header: "Why", cell: (row) => <span className="text-dense">{row.reason}</span> },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {canMove ? (
            <ReslotApproveControl
              recommendation={row}
              canReadLocations={locationsReadable}
              isPending={isApproving}
              onApprove={onApprove}
            />
          ) : null}
          {canDismiss ? <DismissButton recommendationId={row.id} onDismiss={onDismiss} /> : null}
        </div>
      ),
    },
  ];
}

function DismissButton({
  recommendationId,
  onDismiss,
}: {
  recommendationId: number;
  onDismiss: (recommendationId: number) => void;
}) {
  function handleClick(): void {
    onDismiss(recommendationId);
  }
  return (
    <Button size="sm" variant="ghost" className="text-dense" onClick={handleClick}>
      Dismiss
    </Button>
  );
}
