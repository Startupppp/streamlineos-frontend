"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useQualityHold, useReleaseQualityHold } from "@/hooks/api/inventory/quality";
import type { QualityHold } from "@/hooks/api/inventory/quality";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { QUALITY_HOLD_STATUS_BADGE, QUALITY_HOLD_STATUS_LABEL } from "@/features/inventory/lib";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  holdId: number | null;
}

function HoldInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value ?? "—"}</div>
    </div>
  );
}

export function HoldDetailSheet({ open, onOpenChange, holdId }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canRelease = useCan("inventory:quality:release");

  const holdQuery = useQualityHold(holdId ?? 0);
  const releaseMut = useReleaseQualityHold();
  const variantsQuery = useProductVariants();

  const hold = holdQuery.data;
  const isLoading = holdQuery.isLoading;

  function resolveVariantLabel(variantId: number): string {
    const variant = (variantsQuery.data ?? []).find((v) => v.id === variantId);
    return variant ? `${variant.sku} — ${variant.productName}` : `Variant #${variantId}`;
  }

  function handleOpenConfirm(): void {
    setConfirmOpen(true);
  }

  function handleDismissConfirm(): void {
    setConfirmOpen(false);
  }

  function handleRelease(): void {
    if (!holdId) return;
    releaseMut.mutate(holdId, {
      onSuccess: () => {
        toast.success("Hold released");
        setConfirmOpen(false);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setConfirmOpen(false);
      },
    });
  }

  const footer =
    hold && hold.status === "ACTIVE" && canRelease ? (
      <LoadingButton size="sm" onClick={handleOpenConfirm} isPending={releaseMut.isPending} loadingText="Releasing…">
        Release Hold
      </LoadingButton>
    ) : undefined;

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={holdId ? `Hold #${holdId}` : "Hold Details"}
        description="Quality hold details"
        footer={footer}
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !hold ? (
          <p className="text-sm text-muted-foreground">Could not load hold details.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className={cn("h-5 text-[10px] px-2 border", QUALITY_HOLD_STATUS_BADGE[hold.status])}
              >
                {QUALITY_HOLD_STATUS_LABEL[hold.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(hold.createdAt), "dd MMM yyyy")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HoldInfoRow label="Product Variant" value={resolveVariantLabel(hold.productVariantId)} />
              <HoldInfoRow
                label="Quantity"
                value={<span className="tabular-nums font-mono">{hold.quantity}</span>}
              />
              <HoldInfoRow label="Reason" value={hold.reason} />
              {hold.lotId && <HoldInfoRow label="Lot" value={`Lot #${hold.lotId}`} />}
              {hold.serialId && <HoldInfoRow label="Serial" value={`S/N #${hold.serialId}`} />}
              {hold.locationId && (
                <HoldInfoRow label="Location" value={`Location #${hold.locationId}`} />
              )}
              <HoldInfoRow
                label="Updated"
                value={format(new Date(hold.updatedAt), "dd MMM yyyy HH:mm")}
              />
            </div>
          </div>
        )}
      </AppSheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release this hold?</AlertDialogTitle>
            <AlertDialogDescription>
              The inventory will be returned to available stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                isPending={releaseMut.isPending}
                loadingText="Releasing…"
                onClick={handleRelease}
              >
                Release
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
