"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { AppSheet, ErrorState } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PACKAGE_STATUS_BADGE,
  PACKAGE_STATUS_LABEL,
} from "@/features/inventory/lib";
import {
  usePackageDetail,
  useUpdatePackageLines,
  useClosePackage,
  useReopenPackage,
} from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { buildDefaultLines, type EditableLine } from "./package-line-types";
import { EditableLineRow } from "./package-editable-line-row";
import { PackageLifecycleDialogs } from "./package-lifecycle-dialogs";

interface PackageDetailSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packageId: number | null;
}

export function PackageDetailSheet({ open, onOpenChange, packageId }: PackageDetailSheetProps) {
  const pkgQuery = usePackageDetail(packageId ?? 0);
  const updateLinesMutation = useUpdatePackageLines();
  const closeMutation = useClosePackage();
  const reopenMutation = useReopenPackage();

  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState<boolean>(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState<boolean>(false);
  const [hydratedPackageId, setHydratedPackageId] = useState<number | null>(null);

  function handleRefetchPackage(): void {
    void pkgQuery.refetch();
  }

  const pkg = pkgQuery.data;

  if (pkg && hydratedPackageId !== pkg.id) {
    setHydratedPackageId(pkg.id);
    setEditableLines(buildDefaultLines(pkg.items));
  }

  function handleAddLine(): void {
    setEditableLines((prev) => [...prev, { variantId: "", qty: "1", lotId: "", serialId: "" }]);
  }

  const handleRemoveLine = useCallback((index: number): void => {
    setEditableLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChangeField = useCallback((index: number, field: keyof EditableLine, value: string): void => {
    setEditableLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }, []);

  function handleSaveLines(): void {
    if (!packageId) return;
    const lines = editableLines
      .filter((l) => l.variantId.trim() && Number(l.qty) > 0)
      .map((l) => ({
        variantId: Number(l.variantId),
        qty: Number(l.qty),
        ...(l.lotId ? { lotId: Number(l.lotId) } : {}),
        ...(l.serialId ? { serialId: Number(l.serialId) } : {}),
      }));
    updateLinesMutation.mutate(
      { packageId, lines },
      {
        onSuccess: () => toast.success("Lines updated"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenCloseConfirm(): void {
    setCloseConfirmOpen(true);
  }

  function handleCloseConfirmDismiss(): void {
    setCloseConfirmOpen(false);
  }

  function handleConfirmClose(): void {
    if (!packageId) return;
    closeMutation.mutate(packageId, {
      onSuccess: () => {
        toast.success("Package closed");
        setCloseConfirmOpen(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 422) {
          toast.error("Package content exceeds picked quantity");
        } else {
          toast.error(getErrorMessage(error));
        }
        setCloseConfirmOpen(false);
      },
    });
  }

  function handleOpenReopenConfirm(): void {
    setReopenConfirmOpen(true);
  }

  function handleReopenConfirmDismiss(): void {
    setReopenConfirmOpen(false);
  }

  function handleConfirmReopen(): void {
    if (!packageId) return;
    reopenMutation.mutate(packageId, {
      onSuccess: () => {
        toast.success("Package reopened");
        setReopenConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setReopenConfirmOpen(false);
      },
    });
  }

  const isOpen = pkg?.status === "OPEN";
  const isClosed = pkg?.status === "CLOSED";

  const title = packageId ? `Package #${packageId}` : "Package Details";

  return (
    <>
      <AppSheet open={open} onOpenChange={onOpenChange} title={title}>
        {pkgQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : pkgQuery.error || !pkg ? (
          <ErrorState
            title="Failed to load package"
            description={pkgQuery.error ? getErrorMessage(pkgQuery.error) : "Package not found"}
            onRetry={handleRefetchPackage}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn("h-4 text-micro px-1.5 py-0 border", PACKAGE_STATUS_BADGE[pkg.status])}
              >
                {PACKAGE_STATUS_LABEL[pkg.status]}
              </Badge>
              {pkg.shipmentId && (
                <span className="text-xs text-muted-foreground">Shipment #{pkg.shipmentId}</span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Created</p>
              <p className="text-sm">{new Date(pkg.createdAt).toLocaleDateString()}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Lines</p>
                {isOpen && (
                  <AnimatedIconButton
                    type="button"
                    icon={PlusIcon}
                    iconSize={12}
                    iconClassName="mr-1"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleAddLine}
                  >
                    Add
                  </AnimatedIconButton>
                )}
              </div>

              {isOpen ? (
                <div className="space-y-2">
                  {editableLines.length === 0 && (
                    <p className="text-xs text-muted-foreground">No lines. Click Add to begin.</p>
                  )}
                  {editableLines.map((line, index) => (
                    <EditableLineRow
                      key={index}
                      index={index}
                      line={line}
                      onChangeField={handleChangeField}
                      onRemove={handleRemoveLine}
                    />
                  ))}
                  {editableLines.length > 0 && (
                    <LoadingButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleSaveLines}
                      isPending={updateLinesMutation.isPending}
                      loadingText="Saving…"
                    >
                      Save Lines
                    </LoadingButton>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border">
                  {pkg.items && pkg.items.length > 0 ? (
                    pkg.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{item.productVariant?.name ?? `Variant #${item.productVariantId}`}</span>
                          {item.lotId && (
                            <span className="ml-2 text-xs text-muted-foreground">Lot #{item.lotId}</span>
                          )}
                          {item.serialId && (
                            <span className="ml-2 text-xs text-muted-foreground">S/N #{item.serialId}</span>
                          )}
                        </div>
                        <span className="text-sm tabular-nums">{item.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted-foreground">No items</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {isOpen && (
                <LoadingButton
                  type="button"
                  size="sm"
                  onClick={handleOpenCloseConfirm}
                  isPending={closeMutation.isPending}
                  loadingText="Closing…"
                >
                  Close Package
                </LoadingButton>
              )}
              {isClosed && (
                <LoadingButton
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenReopenConfirm}
                  isPending={reopenMutation.isPending}
                  loadingText="Reopening…"
                >
                  Reopen
                </LoadingButton>
              )}
            </div>
          </div>
        )}
      </AppSheet>

      <PackageLifecycleDialogs
        closeConfirmOpen={closeConfirmOpen}
        onCloseConfirmOpenChange={setCloseConfirmOpen}
        onCloseConfirmDismiss={handleCloseConfirmDismiss}
        onConfirmClose={handleConfirmClose}
        isClosing={closeMutation.isPending}
        reopenConfirmOpen={reopenConfirmOpen}
        onReopenConfirmOpenChange={setReopenConfirmOpen}
        onReopenConfirmDismiss={handleReopenConfirmDismiss}
        onConfirmReopen={handleConfirmReopen}
        isReopening={reopenMutation.isPending}
      />
    </>
  );
}
