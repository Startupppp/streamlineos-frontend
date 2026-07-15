"use client";

import { useState, useMemo, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { TransferDetail } from "@/hooks/api/inventory/stock";

type Line = TransferDetail["lines"][number];
type LineInput = { transferLineId: number; quantityReceived: number; notes: string };
type LineData = { id: number; line: Line; input: LineInput };

function buildInitialInputs(lines: TransferDetail["lines"]): LineInput[] {
  return lines.map((l) => ({
    transferLineId: l.id,
    quantityReceived: l.quantity,
    notes: "",
  }));
}

function ReceiveTransferForm({
  transfer,
  onSubmit,
  isPending,
  onClose,
}: {
  transfer: TransferDetail;
  onSubmit: (lines: { transferLineId: number; quantityReceived: number }[]) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const [lineInputs, setLineInputs] = useState<LineInput[]>(() =>
    buildInitialInputs(transfer.lines),
  );

  function handleReceiveAll() {
    setLineInputs(buildInitialInputs(transfer.lines));
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

  const lineData = useMemo<LineData[]>(
    () =>
      lineInputs.flatMap((li) => {
        const line = transfer.lines.find((l) => l.id === li.transferLineId);
        if (!line) return [];
        return [{ id: li.transferLineId, line, input: li }];
      }),
    [lineInputs, transfer.lines],
  );

  const columns = useMemo<DataTableColumn<LineData>[]>(() => [
    {
      key: "product",
      header: "Product / SKU",
      cell: (ld) => (
        <>
          <p className="font-medium leading-tight truncate max-w-[140px]">
            {ld.line.productName}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">{ld.line.sku}</p>
        </>
      ),
    },
    {
      key: "requested",
      header: "Requested",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (ld) => ld.line.quantity.toLocaleString(),
    },
    {
      key: "received",
      header: "Received",
      cell: (ld) => {
        function handleChange(e: ChangeEvent<HTMLInputElement>) {
          handleQtyChange(ld.id, e.target.value);
        }
        return (
          <Input
            type="number"
            min={0}
            max={ld.line.quantity}
            value={ld.input.quantityReceived}
            onChange={handleChange}
            className="h-8 w-20 text-xs"
          />
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      cell: (ld) => {
        function handleChange(e: ChangeEvent<HTMLInputElement>) {
          handleNotesChange(ld.id, e.target.value);
        }
        return (
          <Input
            type="text"
            placeholder="Optional"
            value={ld.input.notes}
            onChange={handleChange}
            className="h-8 text-xs"
          />
        );
      },
    },
  ], [lineInputs]);

  return (
    <>
      <SheetBody className="space-y-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">Line Items</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReceiveAll}>
            Receive All
          </Button>
        </div>
        <DataTable
          data={lineData}
          columns={columns}
          getRowKey={(ld) => ld.id}
        />
      </SheetBody>
      <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Receiving…" : "Confirm Receipt"}
          </Button>
        </div>
      </SheetFooter>
    </>
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
  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Receive Transfer</SheetTitle>
          <SheetDescription>
            {transfer.referenceNumber} · {transfer.fromLocation?.name ?? "—"} →{" "}
            {transfer.toLocation?.name ?? "—"}
          </SheetDescription>
        </SheetHeader>
        <ReceiveTransferForm
          transfer={transfer}
          onSubmit={onSubmit}
          isPending={isPending}
          onClose={handleClose}
        />
      </SheetContent>
    </Sheet>
  );
}
