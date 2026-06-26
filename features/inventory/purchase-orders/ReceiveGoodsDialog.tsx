"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useReceiveGoods, useWarehouses } from "@/lib/api/hooks/inventory";
import type { PurchaseOrder, PurchaseOrderLine } from "@/types/inventory";

type QualityStatus = "ACCEPTED" | "REJECTED";

interface LineState {
  poLineId: number;
  quantityReceived: string;
  qualityStatus: QualityStatus;
}

interface ReceiveGoodsDialogProps {
  po: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildInitialLineState(lines: PurchaseOrderLine[]): LineState[] {
  return lines.map((l) => ({
    poLineId: l.id,
    quantityReceived: String(
      Math.max(0, parseFloat(l.quantity) - parseFloat(l.quantityReceived))
    ),
    qualityStatus: "ACCEPTED" as QualityStatus,
  }));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReceiveGoodsDialog({ po, open, onOpenChange }: ReceiveGoodsDialogProps) {
  const mutation = useReceiveGoods(po.id);
  const { data: warehouses = [] } = useWarehouses();

  const [lineStates, setLineStates] = useState<LineState[]>(() =>
    buildInitialLineState(po.lines)
  );
  const [receivedDate, setReceivedDate] = useState(todayIso);
  const [locationId, setLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const handleQuantityChange = useCallback((index: number, value: string) => {
    setLineStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, quantityReceived: value } : s))
    );
  }, []);

  const handleQualityChange = useCallback((index: number, value: QualityStatus) => {
    setLineStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, qualityStatus: value } : s))
    );
  }, []);

  const handleReceivedDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReceivedDate(e.target.value);
    },
    []
  );

  const handleLocationChange = useCallback((value: string) => {
    setLocationId(value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    const validLines = lineStates.filter(
      (l) => parseFloat(l.quantityReceived) > 0
    );
    if (validLines.length === 0) {
      toast.error("Enter a received quantity for at least one line");
      return;
    }
    try {
      await mutation.mutateAsync({
        receivedDate,
        locationId: locationId ? parseInt(locationId, 10) : undefined,
        notes: notes.trim() || undefined,
        lines: validLines.map((l) => ({
          poLineId: l.poLineId,
          quantityReceived: parseFloat(l.quantityReceived),
          qualityStatus: l.qualityStatus,
        })),
      });
      toast.success("Goods received successfully");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to receive goods";
      toast.error(message);
    }
  }, [lineStates, receivedDate, locationId, notes, mutation, onOpenChange]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        setLineStates(buildInitialLineState(po.lines));
        setReceivedDate(todayIso());
        setLocationId("");
        setNotes("");
      }
      onOpenChange(value);
    },
    [po.lines, onOpenChange]
  );

  const selectedWarehouse = warehouses.find(
    (w: { id: number; locations?: { id: number; name: string; code: string }[] }) =>
      w.id === po.warehouseId
  ) as { id: number; locations?: { id: number; name: string; code: string }[] } | undefined;

  const locations = selectedWarehouse?.locations ?? [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 gap-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 text-left gap-1 px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Receive goods — {po.poNumber}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Record quantities received against this purchase order
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rg-received-date" className="text-sm">
                  Received date
                </Label>
                <Input
                  id="rg-received-date"
                  type="date"
                  value={receivedDate}
                  onChange={handleReceivedDateChange}
                />
              </div>
              {locations.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="rg-location" className="text-sm">
                    Location
                  </Label>
                  <Select value={locationId} onValueChange={handleLocationChange}>
                    <SelectTrigger id="rg-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name} ({loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_24px_100px_110px] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Product</span>
                <span />
                <span className="text-right">Ordered / Rcvd</span>
                <span>Quality</span>
              </div>
              {po.lines.map((line, index) => {
                const state = lineStates[index];
                if (!state) return null;
                const productName = line.productVariant?.product?.name ?? "Unknown";
                const variantName = line.productVariant?.name ?? "";
                const ordered = parseFloat(line.quantity);
                const alreadyReceived = parseFloat(line.quantityReceived);

                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-[1fr_24px_100px_110px] gap-2 items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{productName}</p>
                      <p className="text-xs text-muted-foreground truncate">{variantName}</p>
                    </div>
                    <div />
                    <div className="space-y-0.5">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        max={ordered - alreadyReceived}
                        className="h-8 text-xs text-right"
                        value={state.quantityReceived}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        aria-label={`Quantity received for ${productName}`}
                      />
                      <p className="text-[10px] text-muted-foreground text-right">
                        of {ordered} ({alreadyReceived} rcvd)
                      </p>
                    </div>
                    <Select
                      value={state.qualityStatus}
                      onValueChange={(v) => handleQualityChange(index, v as QualityStatus)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="rg-notes" className="text-sm">
                Notes
              </Label>
              <Input
                id="rg-notes"
                placeholder="Optional notes"
                value={notes}
                onChange={handleNotesChange}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Receive goods
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
