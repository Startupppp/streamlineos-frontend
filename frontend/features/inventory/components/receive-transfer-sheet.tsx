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
    <TableRow>
      <TableCell className="py-2">
        <p className="font-medium text-sm leading-tight truncate max-w-[140px]">
          {line.productName}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{line.sku}</p>
      </TableCell>
      <TableCell className="py-2 text-right tabular-nums text-sm">
        {line.quantity.toLocaleString()}
      </TableCell>
      <TableCell className="py-2">
        <Input
          type="number"
          min={0}
          max={line.quantity}
          value={input.quantityReceived}
          onChange={handleQtyChange}
          className="h-7 w-20 text-sm"
        />
      </TableCell>
      <TableCell className="py-2">
        <Input
          type="text"
          placeholder="Optional"
          value={input.notes}
          onChange={handleNotesChange}
          className="h-7 text-sm"
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle>Receive Transfer</SheetTitle>
          <SheetDescription>
            {transfer.referenceNumber} · {transfer.fromLocation?.name ?? "—"} →{" "}
            {transfer.toLocation?.name ?? "—"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Line Items</span>
            <Button variant="outline" size="sm" onClick={handleReceiveAll}>
              Receive All
            </Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold">Product / SKU</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Requested</TableHead>
                  <TableHead className="text-xs font-semibold">Received</TableHead>
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
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
        <SheetFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Receiving…" : "Confirm Receipt"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
