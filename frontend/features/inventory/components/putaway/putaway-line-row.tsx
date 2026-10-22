"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCompletePutaway,
  usePutawaySuggestions,
  type PutawayTaskLine,
} from "@/hooks/api/inventory/putaway";
import {
  PUTAWAY_DISPOSITION_BADGE,
  PUTAWAY_DISPOSITION_LABEL,
} from "@/features/inventory/lib/inventory-status";

interface PutawayLineRowProps {
  taskId: number;
  line: PutawayTaskLine;
  disabled: boolean;
  isActive: boolean;
  warehouseId: number | null;
}

function capacityLabel(remaining: string | null): string {
  return remaining === null ? "unlimited room" : `${remaining} left`;
}

export function PutawayLineRow({
  taskId,
  line,
  disabled,
  isActive,
  warehouseId,
}: PutawayLineRowProps) {
  const [quantity, setQuantity] = useState(line.remaining);
  const [destination, setDestination] = useState(
    line.to_location_id === null ? "" : String(line.to_location_id),
  );
  const complete = useCompletePutaway();
  const cardRef = useRef<HTMLLIElement>(null);

  const live = usePutawaySuggestions({
    warehouseId,
    productVariantId: line.product_variant_id,
    quantity: quantity,
  });
  const suggestions = live.data ?? line.suggestions;

  useEffect(
    function revealScannedLine() {
      if (!isActive) return;
      cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [isActive],
  );

  const closed = /^-?0(\.0+)?$/.test(line.remaining);
  const quarantined = line.disposition === "QUARANTINE";

  function handleQuantityChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setQuantity(event.target.value);
  }

  function handleDestinationChange(value: string): void {
    setDestination(value);
  }

  function handleConfirm(): void {
    complete.mutate(
      {
        taskId,
        taskLineId: line.id,
        quantity,
        ...(quarantined || !destination ? {} : { toLocationId: Number(destination) }),
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.status === "COMPLETED" ? "Putaway complete" : `Put away ${quantity}`,
          );
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <li
      ref={cardRef}
      className={cn(
        CONTENT_PANEL_SOLID,
        "flex flex-col gap-3 p-3",
        closed && "opacity-60",
        isActive && "ring-2 ring-ring",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{line.sku}</p>
          <p className="truncate text-xs text-muted-foreground">{line.variant_name}</p>
          {line.lot_number || line.serial_number ? (
            <p className="truncate font-mono text-micro text-muted-foreground">
              {line.lot_number ? `Lot ${line.lot_number}` : null}
              {line.lot_number && line.serial_number ? " · " : null}
              {line.serial_number ? `Serial ${line.serial_number}` : null}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm tabular-nums">
            {line.quantity_moved} / {line.quantity}
          </p>
          <Badge
            variant="outline"
            className={cn("mt-1 h-4 px-1.5 py-0 text-micro", PUTAWAY_DISPOSITION_BADGE[line.disposition])}
          >
            {PUTAWAY_DISPOSITION_LABEL[line.disposition]}
          </Badge>
        </div>
      </div>

      {closed ? null : (
        <div className="flex flex-col gap-2">
          {quarantined ? (
            <p className="text-xs text-muted-foreground">
              These goods failed inspection or are on hold. They go to{" "}
              <span className="font-mono">{line.to_location_code ?? "quarantine"}</span> and
              nowhere else.
            </p>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor={`putaway-bin-${line.id}`}>Bin</Label>
              <Select
                value={destination}
                onValueChange={handleDestinationChange}
                disabled={disabled}
              >
                <SelectTrigger id={`putaway-bin-${line.id}`}>
                  <SelectValue placeholder="Where did these go?" />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {suggestions.map((suggestion) => (
                    <SelectItem key={suggestion.locationId} value={String(suggestion.locationId)}>
                      {suggestion.code} — {capacityLabel(suggestion.remaining)}
                      {suggestion.holdsVariant ? " · already holds this SKU" : ""}
                      {suggestion.slotRuleName === null ? "" : ` · ${suggestion.slotRuleName}`}
                      {suggestion.fits ? "" : " · will not fit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`putaway-qty-${line.id}`}>Quantity</Label>
              <Input
                id={`putaway-qty-${line.id}`}
                value={quantity}
                onChange={handleQuantityChange}
                inputMode="decimal"
                className="font-mono tabular-nums"
                disabled={disabled}
              />
            </div>
            <LoadingButton
              size="sm"
              onClick={handleConfirm}
              isPending={complete.isPending}
              loadingText="Confirming…"
              disabled={disabled || (!quarantined && !destination)}
            >
              Confirm
            </LoadingButton>
          </div>
        </div>
      )}
    </li>
  );
}
