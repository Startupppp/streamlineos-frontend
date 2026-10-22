"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Check, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

export interface RfStepProps {
  sku: string;
  productName: string;
  locationCode: string | null;
  lotNumber?: string | null;
  quantityAsked: string;
  quantityDone: string;
  unitLabel?: string;
  position: { index: number; total: number };
  isPending: boolean;
  onConfirm: (input: { quantity: string; scannedPayload: string | null }) => void;
  onSkip?: () => void;
  skipLabel?: string;
}

const QUANTITY = /^\d{1,10}(\.\d{1,4})?$/;

export function RfStep({
  sku,
  productName,
  locationCode,
  lotNumber,
  quantityAsked,
  quantityDone,
  unitLabel,
  position,
  isPending,
  onConfirm,
  onSkip,
  skipLabel,
}: RfStepProps) {
  const remaining = Math.max(0, Number(quantityAsked) - Number(quantityDone));
  const [quantity, setQuantity] = useState(() => String(remaining));
  const [scan, setScan] = useState("");

  const handleConfirm = useCallback(() => {
    if (!QUANTITY.test(quantity) || Number(quantity) <= 0) {
      toast.error("Enter how many you took");
      return;
    }
    onConfirm({ quantity: Number(quantity).toFixed(4), scannedPayload: scan.trim() || null });
  }, [onConfirm, quantity, scan]);

  const handleScanKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Line {position.index} of {position.total}
      </p>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="font-mono text-lg font-semibold leading-tight">{sku}</p>
        <p className="mt-1 text-sm text-muted-foreground">{productName}</p>
        {lotNumber && (
          <p className="mt-1 text-xs text-muted-foreground">Lot {lotNumber}</p>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Location
        </p>
        <p
          className={cn(
            "font-mono text-2xl font-semibold leading-tight",
            locationCode === null && "text-muted-foreground",
          )}
        >
          {locationCode ?? "Not set"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rf-scan">Scan</Label>
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="rf-scan"
            autoFocus
            inputMode="text"
            autoComplete="off"
            className="h-12 pl-9 font-mono text-base"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder="Scan the item"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rf-quantity">
          Quantity {unitLabel ? `(${unitLabel})` : ""} — asked for {quantityAsked}
        </Label>
        <Input
          id="rf-quantity"
          inputMode="decimal"
          className="h-14 text-center font-mono text-2xl"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <LoadingButton
          size="lg"
          className="h-14 w-full text-base"
          onClick={handleConfirm}
          isPending={isPending}
          loadingText="Confirming…"
        >
          <Check className="h-5 w-5" />
          Confirm
        </LoadingButton>
        {onSkip && (
          <Button variant="outline" size="lg" className="h-12 w-full" onClick={onSkip}>
            {skipLabel ?? "Can't do this one"}
          </Button>
        )}
      </div>
    </div>
  );
}
