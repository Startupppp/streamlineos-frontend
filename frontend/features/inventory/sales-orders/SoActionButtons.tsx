"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle, Truck, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useConfirmSalesOrder,
  useShipSalesOrder,
  useInvoiceSalesOrder,
} from "@/lib/api/hooks/inventory/sales-orders";

interface SoLine {
  productId: number;
  quantity: number | string;
}

interface SoActionButtonsProps {
  soId: number;
  status: string;
  onSuccess: () => void;
  lines?: SoLine[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SoActionButtons({ soId, status, onSuccess, lines = [] }: SoActionButtonsProps) {
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [shipDate, setShipDate] = useState(todayIso);
  const [trackingNumber, setTrackingNumber] = useState("");

  const confirmMutation = useConfirmSalesOrder();
  const shipMutation = useShipSalesOrder();
  const invoiceMutation = useInvoiceSalesOrder();

  const isMutating =
    confirmMutation.isPending || shipMutation.isPending || invoiceMutation.isPending;

  const handleConfirm = useCallback(() => {
    confirmMutation.mutate(
      { soId },
      {
        onSuccess: () => {
          toast.success("Order confirmed");
          onSuccess();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [soId, confirmMutation, onSuccess]);

  const handleShipDialogOpen = useCallback(() => {
    setShipDate(todayIso());
    setTrackingNumber("");
    setShipDialogOpen(true);
  }, []);

  const handleShipDialogOpenChange = useCallback((open: boolean) => {
    setShipDialogOpen(open);
  }, []);

  const handleShipDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShipDate(e.target.value);
  }, []);

  const handleTrackingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTrackingNumber(e.target.value);
  }, []);

  const handleShipSubmit = useCallback(() => {
    const shippedLines = lines.map((l) => ({
      productId: l.productId,
      shippedQty: Number(l.quantity),
    }));
    shipMutation.mutate(
      {
        soId,
        shippedLines,
        trackingNumber: trackingNumber.trim() || undefined,
        notes: shipDate ? `Ship date: ${shipDate}` : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Order shipped");
          setShipDialogOpen(false);
          onSuccess();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [soId, lines, shipDate, trackingNumber, shipMutation, onSuccess]);

  const handleInvoice = useCallback(() => {
    invoiceMutation.mutate(
      { soId },
      {
        onSuccess: () => {
          toast.success("Invoice generated");
          onSuccess();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [soId, invoiceMutation, onSuccess]);

  return (
    <>
      {status === "DRAFT" && (
        <Button size="sm" onClick={handleConfirm} disabled={isMutating}>
          {confirmMutation.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-1 size-4" />
          )}
          {confirmMutation.isPending ? "Confirming…" : "Confirm Order"}
        </Button>
      )}

      {status === "CONFIRMED" && (
        <Button size="sm" onClick={handleShipDialogOpen} disabled={isMutating}>
          <Truck className="mr-1 size-4" />
          Ship Order
        </Button>
      )}

      {status === "SHIPPED" && (
        <Button size="sm" onClick={handleInvoice} disabled={isMutating}>
          {invoiceMutation.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <FileText className="mr-1 size-4" />
          )}
          {invoiceMutation.isPending ? "Generating…" : "Generate Invoice"}
        </Button>
      )}

      <Dialog open={shipDialogOpen} onOpenChange={handleShipDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ship order</DialogTitle>
            <DialogDescription>
              Confirm the ship date and optional tracking number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="so-ship-date" className="text-sm">
                Ship date
              </Label>
              <Input
                id="so-ship-date"
                type="date"
                value={shipDate}
                onChange={handleShipDateChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="so-tracking" className="text-sm">
                Tracking number
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                id="so-tracking"
                placeholder="e.g. 1Z999AA10123456784"
                value={trackingNumber}
                onChange={handleTrackingChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShipDialogOpen(false)}
              disabled={shipMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleShipSubmit} disabled={shipMutation.isPending}>
              {shipMutation.isPending && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              {shipMutation.isPending ? "Shipping…" : "Confirm Ship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
