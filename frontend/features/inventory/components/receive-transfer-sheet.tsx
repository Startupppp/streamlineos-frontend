"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransferDetail } from "@/hooks/api/inventory/stock";

type Line = TransferDetail["lines"][number];
type LineInput = { transferLineId: number; quantityReceived: number; notes: string };

function ReceiveLineRow({
  line,
  input,
  onQtyChange,
  onNotesChange,
}: {
  line: Line;
  input: LineInput;
  onQtyChange: (id: number, v: string) => void;
  onNotesChange: (id: number, v: string) => void;
}) {
  function handleQtyChange(e: ChangeEvent<HTMLInputElement>) {
    onQtyChange(line.id, e.target.value);
  }
  function handleNotesChange(e: ChangeEvent<HTMLInputElement>) {
    onNotesChange(line.id, e.target.value);
  }
  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="px-2 py-2">
        <p className="font-medium text-[11px] leading-tight truncate max-w-[140px]">
          {line.productName}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono">{line.sku}</p>
      </TableCell>
      <TableCell className="px-2 py-2 text-right font-mono tabular-nums text-[11px]">
        {line.quantity.toLocaleString()}
      </TableCell>
      <TableCell className="px-2 py-2">
        <Input
          type="number"
          min={0}
          max={line.quantity}
          value={input.quantityReceived}
          onChange={handleQtyChange}
          className="h-7 w-20 text-xs"
        />
      </TableCell>
      <TableCell className="px-2 py-2">
        <Input
          type="text"
          placeholder="Optional"
          value={input.notes}
          onChange={handleNotesChange}
          className="h-7 text-xs"
        />
      </TableCell>
    </TableRow>
  );
}

export function ReceiveTransferSheet({
  open,
  onOpenChange,
  transfer,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transfer: TransferDetail;
  onSubmit: (lines: { transferLineId: number; quantityReceived: number }[]) => void;
  isPending: boolean;
}) {
  const [lineInputs, setLineInputs] = useState<LineInput[]>([]);

  useEffect(() => {
    if (open) {
      setLineInputs(
        transfer.lines.map((l) => ({
          transferLineId: l.id,
          quantityReceived: l.quantity,
          notes: "",
        })),
      );
    }
  }, [open, transfer.lines]);

  function handleReceiveAll() {
    setLineInputs(
      transfer.lines.map((l) => ({
        transferLineId: l.id,
        quantityReceived: l.quantity,
        notes: "",
      })),
    );
  }

  function handleQtyChange(id: number, v: string) {
    const line = transfer.lines.find((l) => l.id === id);
    const qty = Math.max(0, Math.min(Number(v) || 0, line?.quantity ?? 0));
    setLineInputs((prev) =>
      prev.map((li) =>
        li.transferLineId === id ? { ...li, quantityReceived: qty } : li,
      ),
    );
  }

  function handleNotesChange(id: number, v: string) {
    setLineInputs((prev) =>
      prev.map((li) => (li.transferLineId === id ? { ...li, notes: v } : li)),
    );
  }

  function handleSubmit() {
    onSubmit(
      lineInputs.map(({ transferLineId, quantityReceived }) => ({
        transferLineId,
        quantityReceived,
      })),
    );
  }

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Receive Transfer</SheetTitle>
          <SheetDescription>
            {transfer.referenceNumber} · {transfer.fromLocation?.name ?? "—"} →{" "}
            {transfer.toLocation?.name ?? "—"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">Line Items</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReceiveAll}>
              Receive All
            </Button>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/80 hover:bg-muted/80">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                    Product / SKU
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">
                    Requested
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                    Received
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineInputs.map((li) => {
                  const line = transfer.lines.find((l) => l.id === li.transferLineId);
                  if (!line) return null;
                  return (
                    <ReceiveLineRow
                      key={li.transferLineId}
                      line={line}
                      input={li}
                      onQtyChange={handleQtyChange}
                      onNotesChange={handleNotesChange}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Receiving…" : "Confirm Receipt"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
