"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmPick, type PickWaveLine } from "@/hooks/api/inventory/picking";
import {
  PICK_EXCEPTION_BADGE,
  PICK_EXCEPTION_LABEL,
  PICK_EXCEPTION_STATUS_BADGE,
  PICK_EXCEPTION_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";

interface PickTaskRowProps {
  pickListId: number;
  line: PickWaveLine;
  disabled: boolean;
  onReportException: (line: PickWaveLine) => void;
}

function remaining(line: PickWaveLine): string {
  const left = Number(line.quantity_to_pick) - Number(line.quantity_picked);
  return (left > 0 ? left : 0).toFixed(4);
}

/**
 * One task on the walk: where it is, what it is, how many, scan, confirm.
 *
 * A card rather than a table row because this is the surface a picker holds in
 * one hand at 375px. The fields are stacked in the order the walk happens —
 * location first, because that is what the picker is looking for before they
 * look at anything else — and the confirm control is the last thing in the card
 * so a thumb reaches it without covering the quantity it is about to commit.
 */
export function PickTaskRow({
  pickListId,
  line,
  disabled,
  onReportException,
}: PickTaskRowProps) {
  const [quantity, setQuantity] = useState(remaining(line));
  const [scan, setScan] = useState("");
  const confirmPick = useConfirmPick();

  // B5. The server's answer, not a local re-derivation of it. The rule now has
  // three clauses -- picked in full, a closing reason, and a reviewer's signature
  // where one is required -- and a copy here would be a fourth place for it to
  // drift. A WRONG_LOCATION line in particular still has work left in it, which
  // the old "any reason closes the row" test got exactly backwards.
  const closed = line.line_closed;

  function handleQuantityChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setQuantity(event.target.value);
  }

  function handleScanChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setScan(event.target.value);
  }

  function handleException(): void {
    onReportException(line);
  }

  function handleConfirm(): void {
    confirmPick.mutate(
      {
        pickListId,
        pickLineId: line.id,
        quantityPicked: quantity,
        scannedPayload: scan.trim() ? scan.trim() : undefined,
      },
      {
        onSuccess: (result) => {
          setScan("");
          toast.success(
            result.waveComplete ? "Wave complete" : `Picked ${result.quantityPicked}`,
          );
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <li className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-3", closed && "opacity-60")}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold tabular-nums">
            {line.location_code ?? "No location"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {line.sku} · {line.variant_name}
          </p>
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
            {Number(line.quantity_picked).toFixed(2)} / {Number(line.quantity_to_pick).toFixed(2)}
          </p>
          {line.so_number ? (
            <p className="font-mono text-micro text-muted-foreground">{line.so_number}</p>
          ) : null}
        </div>
      </div>

      {line.exception_reason ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("text-micro", PICK_EXCEPTION_BADGE[line.exception_reason])}
            >
              {PICK_EXCEPTION_LABEL[line.exception_reason]}
            </Badge>
            {line.exception_status ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-micro",
                  PICK_EXCEPTION_STATUS_BADGE[line.exception_status],
                )}
              >
                {PICK_EXCEPTION_STATUS_LABEL[line.exception_status]}
              </Badge>
            ) : null}
          </div>
          {/* Names, never ids: the picker needs to know who is holding this up. */}
          {line.exception_owner_name ? (
            <p className="truncate text-micro text-muted-foreground">
              With {line.exception_owner_name}
            </p>
          ) : null}
          {line.substitute_sku ? (
            <p className="truncate text-micro text-muted-foreground">
              {line.substitute_quantity ? Number(line.substitute_quantity).toFixed(2) : null}{" "}
              of {line.substitute_sku} went in instead
            </p>
          ) : null}
          {line.exception_location_code ? (
            <p className="truncate text-micro text-muted-foreground">
              Found at {line.exception_location_code}
            </p>
          ) : null}
        </div>
      ) : null}

      {closed ? null : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <Input
              value={scan}
              onChange={handleScanChange}
              placeholder="Scan SKU, lot or serial"
              aria-label={`Scan for ${line.sku}`}
              autoComplete="off"
              disabled={disabled}
            />
            <Input
              value={quantity}
              onChange={handleQuantityChange}
              inputMode="decimal"
              aria-label={`Quantity picked for ${line.sku}`}
              className="font-mono tabular-nums"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleException} disabled={disabled}>
              Exception
            </Button>
            <LoadingButton
              size="sm"
              onClick={handleConfirm}
              isPending={confirmPick.isPending}
              loadingText="Confirming…"
              disabled={disabled}
            >
              Confirm
            </LoadingButton>
          </div>
        </div>
      )}
    </li>
  );
}
