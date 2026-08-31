"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useConsignedStock,
  useConvertOwnership,
  type ConsignedRow,
} from "@/hooks/api/inventory/stock-types-dock";

function ConsignmentContent() {
  const canView = useCan("inventory:stock:read");
  const canConvert = useCan("inventory:stock:adjust");
  const { data, isLoading, isError, refetch } = useConsignedStock();
  const convert = useConvertOwnership();

  const [selected, setSelected] = useState<ConsignedRow | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleConvert = useCallback(() => {
    if (!selected) return;
    if (!/^\d{1,14}(\.\d{1,4})?$/.test(quantity) || Number(quantity) <= 0) {
      toast.error("Enter how many units you are taking title to");
      return;
    }
    if (!/^\d{1,14}(\.\d{1,4})?$/.test(unitCost)) {
      toast.error("Enter the price agreed with the supplier");
      return;
    }
    convert.mutate(
      {
        productVariantId: selected.product_variant_id,
        locationId: selected.location_id,
        quantity,
        fromOwnership: selected.ownership,
        toOwnership: "OWNED",
        unitCost,
      },
      {
        onSuccess: () => {
          toast.success("Title taken; the stock is now ours and available");
          setSelected(null);
          setQuantity("");
          setUnitCost("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [convert, quantity, selected, unitCost]);

  const COLUMNS: DataTableColumn<ConsignedRow>[] = [
    {
      key: "variant",
      header: "Variant",
      cell: (row) => <span className="text-sm">#{row.product_variant_id}</span>,
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => <span className="font-mono text-xs">#{row.location_id}</span>,
    },
    {
      key: "ownership",
      header: "Owner",
      cell: (row) => (
        <Badge variant="outline" className="text-dense">
          {row.ownership === "VENDOR" ? "Supplier's" : "Customer's"}
        </Badge>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-semibold",
      cell: (row) => Number(row.on_hand).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canConvert && row.ownership === "VENDOR" ? (
          <button
            type="button"
            className="text-xs underline underline-offset-2"
            onClick={() => setSelected(row)}
          >
            Take title
          </button>
        ) : null,
    },
  ];

  if (!canView) {
    return (
      <PageWrapper title="Consignment">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Consignment">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Consignment">
        <ErrorState
          title="Failed to load consigned stock"
          description="An error occurred while fetching stock that is not ours."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Consignment"
      subtitle="Stock standing in your building that belongs to somebody else"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          None of this is available to promise and none of it is in your valuation. Taking title is
          a deliberate act, because it is the moment a liability to the supplier is created — it is
          never a side effect of shipping.
        </p>

        {rows.length > 0 ? (
          <DataTable
            data={rows}
            columns={COLUMNS}
            getRowKey={(row) => `${row.product_variant_id}:${row.location_id}:${row.ownership}`}
            pagination={{ pageSize: 25 }}
            className="flex-1 min-h-0"
          />
        ) : (
          <InventoryEmptyState
            illustration={<EmptyWarehouseIllustration />}
            title="Nothing on consignment"
            description="Every unit in your building is yours. Receive a delivery as supplier-owned to hold stock you have not bought yet."
          />
        )}

        {selected && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
              Take title — variant #{selected.product_variant_id} at location #{selected.location_id}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="convert-quantity">Quantity</Label>
                <Input
                  id="convert-quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="convert-cost">Agreed unit cost</Label>
                <Input
                  id="convert-cost"
                  inputMode="decimal"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>
            <LoadingButton
              size="sm"
              onClick={handleConvert}
              isPending={convert.isPending}
              loadingText="Taking title…"
            >
              Take title
            </LoadingButton>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default function ConsignmentPage() {
  return (
    <Suspense>
      <ConsignmentContent />
    </Suspense>
  );
}
