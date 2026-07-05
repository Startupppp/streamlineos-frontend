"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppSheet, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface EditableLine {
  variantId: string;
  qty: string;
  lotId: string;
  serialId: string;
}

interface PackageDetailSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packageId: number | null;
}

function buildDefaultLines(lines?: { variantId: number; qty: number; lotId?: number | null; serialId?: number | null }[]): EditableLine[] {
  if (!lines || lines.length === 0) return [];
  return lines.map((l) => ({
    variantId: String(l.variantId),
    qty: String(l.qty),
    lotId: l.lotId ? String(l.lotId) : "",
    serialId: l.serialId ? String(l.serialId) : "",
  }));
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

  const pkg = pkgQuery.data;

  if (pkg && hydratedPackageId !== pkg.id) {
    setHydratedPackageId(pkg.id);
    setEditableLines(buildDefaultLines(pkg.lines));
  }

  function handleAddLine(): void {
    setEditableLines((prev) => [...prev, { variantId: "", qty: "1", lotId: "", serialId: "" }]);
  }

  function handleRemoveLine(index: number): void {
    setEditableLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLineVariantChange(index: number, e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setEditableLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, variantId: value } : l)),
    );
  }

  function handleLineQtyChange(index: number, e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setEditableLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, qty: value } : l)),
    );
  }

  function handleLineLotChange(index: number, e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setEditableLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, lotId: value } : l)),
    );
  }

  function handleLineSerialChange(index: number, e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setEditableLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, serialId: value } : l)),
    );
  }

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
        onError: (error) => toast.error(error.message),
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
        if (error.message.includes("PACKAGE_CONTENT_MISMATCH")) {
          toast.error("Package content exceeds picked quantity");
        } else {
          toast.error(error.message);
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
        toast.error(error.message);
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
            description={pkgQuery.error?.message ?? "Package not found"}
            onRetry={() => void pkgQuery.refetch()}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn("h-4 text-[9px] px-1.5 py-0 border", PACKAGE_STATUS_BADGE[pkg.status])}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleAddLine}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {isOpen ? (
                <div className="space-y-2">
                  {editableLines.length === 0 && (
                    <p className="text-xs text-muted-foreground">No lines. Click Add to begin.</p>
                  )}
                  {editableLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 items-end">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Variant ID</Label>
                        <Input
                          type="number"
                          min="1"
                          value={line.variantId}
                          onChange={(e) => handleLineVariantChange(index, e)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={line.qty}
                          onChange={(e) => handleLineQtyChange(index, e)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Lot ID</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="—"
                          value={line.lotId}
                          onChange={(e) => handleLineLotChange(index, e)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Serial ID</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="—"
                          value={line.serialId}
                          onChange={(e) => handleLineSerialChange(index, e)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRemoveLine(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {editableLines.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleSaveLines}
                      disabled={updateLinesMutation.isPending}
                    >
                      {updateLinesMutation.isPending ? "Saving…" : "Save Lines"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border">
                  {pkg.lines && pkg.lines.length > 0 ? (
                    pkg.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{line.variantName}</span>
                          {line.lotId && (
                            <span className="ml-2 text-xs text-muted-foreground">Lot #{line.lotId}</span>
                          )}
                          {line.serialId && (
                            <span className="ml-2 text-xs text-muted-foreground">S/N #{line.serialId}</span>
                          )}
                        </div>
                        <span className="text-sm tabular-nums">{line.qty}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted-foreground">No lines</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {isOpen && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenCloseConfirm}
                  disabled={closeMutation.isPending}
                >
                  Close Package
                </Button>
              )}
              {isClosed && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenReopenConfirm}
                  disabled={reopenMutation.isPending}
                >
                  Reopen
                </Button>
              )}
            </div>
          </div>
        )}
      </AppSheet>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Package</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this package will lock its contents. This fails if content exceeds picked quantity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseConfirmDismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "Closing…" : "Close Package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenConfirmOpen} onOpenChange={setReopenConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Package</AlertDialogTitle>
            <AlertDialogDescription>
              Reopening will allow editing the package lines again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReopenConfirmDismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReopen} disabled={reopenMutation.isPending}>
              {reopenMutation.isPending ? "Reopening…" : "Reopen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
