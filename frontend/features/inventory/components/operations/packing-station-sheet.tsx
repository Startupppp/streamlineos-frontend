"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { typeScaleClass } from "@/lib/design-tokens";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useCreatePackage, useClosePackage } from "@/hooks/api/inventory/shipping";
import {
  usePackageReconciliation,
  useScanIntoPackage,
  useSuggestCarton,
  type CartonSuggestion,
  type PackingQueueRow,
  type PackingReconciliationLine,
} from "@/hooks/api/inventory/packing";
import { useScanTarget } from "@/features/inventory/hooks/use-scan-target";
import { useCanState } from "@/hooks/api/access";
import { scanNamesVariant, type ResolvedScan } from "@/features/inventory/lib/scan-resolution";
import { ScanField } from "@/features/inventory/components/scan";
import { PackingCartonPicker } from "@/features/inventory/components/operations/packing-carton-picker";

interface PackingStationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PackingQueueRow | null;
}

interface VariantLike {
  id: number;
  name: string;
  sku: string;
  productName: string;
}

function variantLabel(variants: VariantLike[], variantId: number): string {
  const variant = variants.find((v) => v.id === variantId);
  return variant ? `${variant.productName} — ${variant.name}` : "Unknown item";
}

function variantSku(variants: VariantLike[], variantId: number): string | null {
  return variants.find((v) => v.id === variantId)?.sku ?? null;
}

function QuantityList({
  lines,
  variants,
  emptyLabel,
}: {
  lines: PackingReconciliationLine[];
  variants: VariantLike[];
  emptyLabel: string;
}) {
  if (lines.length === 0)
    return <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-border/60 rounded-md border border-border/70">
      {lines.map((line) => (
        <li key={line.productVariantId} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className={cn("min-w-0 truncate", typeScaleClass("dense"))}>
            {variantLabel(variants, line.productVariantId)}
          </span>
          <span className="font-mono text-sm tabular-nums">{Number(line.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * B6 — the packing bench for one order.
 *
 * A carton, a scanner and the two lists that matter: what is still owed to the
 * box, and what is already in it. Every scan is reconciled against what the
 * picker actually took off the shelf, so the refusal lands here — while the unit
 * is in the packer's hand — rather than at close with the box already taped.
 */
export function PackingStationSheet({ open, onOpenChange, row }: PackingStationSheetProps) {
  const packingState = useCanState("inventory:packages:manage");
  const [cartonTypeId, setCartonTypeId] = useState<string>("");
  const [suggestion, setSuggestion] = useState<CartonSuggestion | null>(null);

  const createPackage = useCreatePackage();
  const scanIntoPackage = useScanIntoPackage();
  const suggestCarton = useSuggestCarton();
  const closePackage = useClosePackage();

  const { data: variants = [] } = useProductVariants({ activeOnly: false });

  const packageId = row?.openPackageId ?? createdPackageIdFor(createPackage.data, row);
  const reconciliation = usePackageReconciliation(packageId ?? 0, { enabled: open && packageId !== null });

  const packedLines = useMemo(() => reconciliation.data?.packed ?? [], [reconciliation.data]);
  const outstandingLines = useMemo(() => reconciliation.data?.outstanding ?? [], [reconciliation.data]);

  /**
   * B2 — the scan is captured before it goes in the box, and it is refused if
   * the box does not owe it. `outstanding` is what the picker actually took off
   * the shelf minus what is already packed, so a unit from another order finds
   * no candidate and stops here, in the packer's hand, rather than at close with
   * the carton already taped.
   */
  const scan = useScanTarget<PackingReconciliationLine>({
    candidates: outstandingLines,
    documentNoun: "carton",
    enabled: packageId !== null,
    match: (line, resolved) =>
      scanNamesVariant(resolved, line.productVariantId, variantSku(variants, line.productVariantId)),
    describe: (line) => ({
      key: String(line.productVariantId),
      primary: variantLabel(variants, line.productVariantId),
      secondary: `${Number(line.quantity)} still to pack`,
    }),
    onResolved: handleScanResolved,
  });

  function handleScanResolved(line: PackingReconciliationLine, resolved: ResolvedScan): void {
    if (packageId === null) return;
    scanIntoPackage.mutate(
      {
        packageId,
        scannedPayload: resolved.raw,
        // Sent alongside the payload so the server re-checks the pairing this
        // client just made; it refuses the two if they name different goods.
        productVariantId: line.productVariantId,
        quantity: "1",
      },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  function handleCartonTypeChange(value: string): void {
    setCartonTypeId(value);
  }

  function handleStartPacking(): void {
    if (!row) return;
    createPackage.mutate(
      { soId: row.soId },
      {
        onSuccess: () => toast.success("Carton opened"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleSuggest(): void {
    suggestCarton.mutate(
      {
        lines: packedLines.map((line) => ({
          productVariantId: line.productVariantId,
          // The API takes whole units: half a unit still occupies a whole one
          // in the box.
          quantity: Math.max(1, Math.ceil(Number(line.quantity))),
        })),
      },
      {
        onSuccess: (result) => {
          setSuggestion(result);
          if (result.recommended) setCartonTypeId(String(result.recommended.cartonTypeId));
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleClose(): void {
    if (packageId === null) return;
    closePackage.mutate(
      { packageId, ...(cartonTypeId ? { cartonTypeId: Number(cartonTypeId) } : {}) },
      {
        onSuccess: () => {
          toast.success("Carton closed");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleCancel(): void {
    onOpenChange(false);
  }

  function handleRetry(): void {
    void reconciliation.refetch();
  }

  const title = row ? `Pack ${row.soNumber}` : "Packing";
  const packedTotal = packedLines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const pickedTotal = row ? Number(row.pickedQuantity) : 0;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={row?.customerName ?? undefined}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleClose}
            isPending={closePackage.isPending}
            loadingText="Closing…"
            disabled={packageId === null || packedTotal === 0}
          >
            Close carton
          </LoadingButton>
        </div>
      }
    >
      {packingState === "denied" ? (
        <NoPermissionState compact permission="inventory:packages:manage" />
      ) : packageId === null ? (
        <div className="space-y-3">
          <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
            No carton is open for this order yet. Opening one starts the manifest; nothing moves
            stock until the order ships.
          </p>
          <LoadingButton
            onClick={handleStartPacking}
            isPending={createPackage.isPending}
            loadingText="Opening…"
            disabled={row === null}
          >
            Open a carton
          </LoadingButton>
        </div>
      ) : reconciliation.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reconciliation.error ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load this carton"
          description={getErrorMessage(reconciliation.error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <ScanField scan={scan} label="Scan an item into this carton" sticky />

          <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
            <span className="font-mono tabular-nums">{packedTotal}</span> of{" "}
            <span className="font-mono tabular-nums">{pickedTotal}</span> picked units in cartons.
          </p>

          <section className="space-y-2">
            <Label className={cn("font-medium", typeScaleClass("label"))}>Still to pack</Label>
            <QuantityList
              lines={outstandingLines}
              variants={variants}
              emptyLabel="Nothing outstanding — every picked unit is in a carton."
            />
          </section>

          <section className="space-y-2">
            <Label className={cn("font-medium", typeScaleClass("label"))}>In this order&apos;s cartons</Label>
            <QuantityList lines={packedLines} variants={variants} emptyLabel="Nothing scanned yet." />
          </section>

          <PackingCartonPicker
            suggestion={suggestion}
            isSuggesting={suggestCarton.isPending}
            canSuggest={packedLines.length > 0}
            cartonTypeId={cartonTypeId}
            onCartonTypeChange={handleCartonTypeChange}
            onSuggest={handleSuggest}
          />
        </div>
      )}
    </AppSheet>
  );
}

/**
 * The carton this session just opened.
 *
 * The queue row is a snapshot taken before the click, so it still says "no open
 * carton" until the list refetches. Reading the mutation's own result closes
 * that window, and it is scoped to the order in hand so a stale result from a
 * previous order cannot leak into this one.
 */
function createdPackageIdFor(
  created: { id: number; soId?: number | null } | undefined,
  row: PackingQueueRow | null,
): number | null {
  if (!created || !row) return null;
  return created.soId === row.soId ? created.id : null;
}
