"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppSheet, ErrorState } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
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
  SHIPMENT_STATUS_BADGE,
  SHIPMENT_STATUS_LABEL,
  PACKAGE_STATUS_BADGE,
  PACKAGE_STATUS_LABEL,
} from "@/features/inventory/lib";
import {
  useShipment,
  useUpdateShipment,
  useShipShipment,
  useCancelShipment,
  useCarriers,
} from "@/hooks/api/inventory/shipping";
import { ShipmentTrackingTimeline } from "./shipment-tracking-timeline";

interface ShipmentDetailSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shipmentId: number | null;
}

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
const SHIPPABLE_STATUSES = new Set(["DRAFT", "PACKED", "LABEL_CREATED"]);

export function ShipmentDetailSheet({ open, onOpenChange, shipmentId }: ShipmentDetailSheetProps) {
  const router = useRouter();
  const shipmentQuery = useShipment(shipmentId ?? 0);
  const updateMutation = useUpdateShipment();
  const shipMutation = useShipShipment();
  const cancelMutation = useCancelShipment();
  const carriersQuery = useCarriers();

  const [carrierId, setCarrierId] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [shipConfirmOpen, setShipConfirmOpen] = useState<boolean>(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState<boolean>(false);

  const shipment = shipmentQuery.data;

  const carrierOptions: ComboboxOption[] = (carriersQuery.data ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
    sublabel: c.code,
  }));

  function handleRefetchShipment(): void {
    void shipmentQuery.refetch();
  }

  function handleCarrierChange(val: string): void {
    setCarrierId(val);
  }

  function handleTrackingNumberChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setTrackingNumber(e.target.value);
  }

  function handleSaveCarrier(): void {
    if (!shipmentId) return;
    updateMutation.mutate(
      {
        shipmentId,
        carrierId: carrierId ? Number(carrierId) : undefined,
        trackingNumber: trackingNumber.trim() || undefined,
      },
      {
        onSuccess: () => toast.success("Shipment updated"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenShipConfirm(): void {
    setShipConfirmOpen(true);
  }

  function handleDismissShipConfirm(): void {
    setShipConfirmOpen(false);
  }

  function handleConfirmShip(): void {
    if (!shipmentId) return;
    shipMutation.mutate(shipmentId, {
      onSuccess: () => {
        toast.success("Shipment marked as shipped");
        setShipConfirmOpen(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 409) {
          toast.error("Ship this order via the sales order first", {
            action: {
              label: "Go to Sales Orders",
              onClick: () => router.push("/inventory/sales-orders"),
            },
          });
        } else {
          toast.error(getErrorMessage(error));
        }
        setShipConfirmOpen(false);
      },
    });
  }

  function handleOpenCancelConfirm(): void {
    setCancelConfirmOpen(true);
  }

  function handleDismissCancelConfirm(): void {
    setCancelConfirmOpen(false);
  }

  function handleConfirmCancel(): void {
    if (!shipmentId) return;
    cancelMutation.mutate(shipmentId, {
      onSuccess: () => {
        toast.success("Shipment cancelled");
        setCancelConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setCancelConfirmOpen(false);
      },
    });
  }

  const title = shipmentId ? `Shipment #${shipmentId}` : "Shipment Details";

  return (
    <>
      <AppSheet open={open} onOpenChange={onOpenChange} title={title}>
        {shipmentQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : shipmentQuery.error || !shipment ? (
          <ErrorState
            title="Failed to load shipment"
            description={shipmentQuery.error ? getErrorMessage(shipmentQuery.error) : "Shipment not found"}
            onRetry={handleRefetchShipment}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "h-4 text-micro px-1.5 py-0 border",
                  SHIPMENT_STATUS_BADGE[shipment.status],
                )}
              >
                {SHIPMENT_STATUS_LABEL[shipment.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(shipment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Sales Order</p>
                {shipment.soId ? (
                  <Link
                    href={`/inventory/sales-orders/${shipment.soId}`}
                    className="text-primary hover:underline"
                  >
                    SO #{shipment.soId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Direct</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Warehouse</p>
                <span>{shipment.warehouseId ? `#${shipment.warehouseId}` : "—"}</span>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Carrier & Tracking</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Carrier</Label>
                  <Combobox
                    options={carrierOptions}
                    value={carrierId || (shipment.carrierId ? String(shipment.carrierId) : "")}
                    onChange={handleCarrierChange}
                    placeholder="Select carrier…"
                    searchPlaceholder="Search carriers…"
                    emptyText="No carriers found"
                    disabled={carriersQuery.isLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tracking-input" className="text-xs">Tracking Number</Label>
                  <Input
                    id="tracking-input"
                    placeholder={shipment.trackingNumber ?? "—"}
                    value={trackingNumber}
                    onChange={handleTrackingNumberChange}
                    className="text-xs"
                  />
                </div>
              </div>
              {/* B7. Not "coming soon": the carrier contract is live and this
                  organisation's carrier is tracked manually, which is a way of
                  running a warehouse rather than a missing feature. Saying so
                  tells the operator what to do; the old copy told them to wait
                  for something nobody was building. */}
              <p className="text-micro text-muted-foreground">
                Tracked manually — record carrier updates below as the courier
                reports them.
              </p>
              <LoadingButton
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleSaveCarrier}
                isPending={updateMutation.isPending}
                loadingText="Saving…"
              >
                Save
              </LoadingButton>
            </div>

            {shipmentId ? (
              <ShipmentTrackingTimeline
                shipmentId={shipmentId}
                trackingNumber={shipment.trackingNumber}
              />
            ) : null}

            {shipment.lines && shipment.lines.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Lines</p>
                <div className="divide-y divide-border rounded-lg border">
                  {shipment.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">{line.productVariant?.name ?? `Variant #${line.productVariantId}`}</span>
                      <span className="text-sm tabular-nums">{Number(line.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shipment.packages && shipment.packages.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Packages ({shipment.packages.length})</p>
                <div className="divide-y divide-border rounded-lg border">
                  {shipment.packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-mono">#{pkg.id}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 text-micro px-1.5 py-0 border",
                          PACKAGE_STATUS_BADGE[pkg.status],
                        )}
                      >
                        {PACKAGE_STATUS_LABEL[pkg.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {SHIPPABLE_STATUSES.has(shipment.status) && (
                <LoadingButton
                  type="button"
                  size="sm"
                  onClick={handleOpenShipConfirm}
                  isPending={shipMutation.isPending}
                  loadingText="Processing…"
                >
                  Mark as Shipped
                </LoadingButton>
              )}
              {!TERMINAL_STATUSES.has(shipment.status) && (
                <LoadingButton
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleOpenCancelConfirm}
                  isPending={cancelMutation.isPending}
                  loadingText="Cancelling…"
                >
                  Cancel
                </LoadingButton>
              )}
            </div>
          </div>
        )}
      </AppSheet>

      <AlertDialog open={shipConfirmOpen} onOpenChange={setShipConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Shipped</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that this shipment has been dispatched to the carrier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissShipConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShip} disabled={shipMutation.isPending}>
              {shipMutation.isPending ? "Processing…" : "Mark as Shipped"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The shipment will be permanently cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissCancelConfirm}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Shipment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
