"use client";

import { memo, useCallback, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpeningStock } from "@/hooks/api/inventory/stock";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";

const openingLineSchema = z.object({
  productVariantId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  qty: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
});

const openingFormSchema = z.object({
  lines: z.array(openingLineSchema).min(1, "At least one line required"),
  notes: z.string().max(500).optional(),
});

interface LineState {
  variantId: string;
  warehouseId: string;
  locationId: string;
  qty: string;
  unitCost: string;
}

function defaultLine(): LineState {
  return { variantId: "", warehouseId: "", locationId: "", qty: "", unitCost: "" };
}

interface OpeningStockSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface EditableLineRowProps {
  index: number;
  line: LineState;
  onChangeField: (index: number, field: keyof LineState, value: string) => void;
  onRemove: (index: number) => void;
}

const EditableLineRow = memo(function EditableLineRow({
  index,
  line,
  onChangeField,
  onRemove,
}: EditableLineRowProps) {
  const { data: variants = [] } = useProductVariants({ activeOnly: true });
  const { data: warehouses = [] } = useWarehouses();
  const { data: locations = [] } = useLocations(Number(line.warehouseId) || 0);

  function handleVariantChange(val: string): void {
    onChangeField(index, "variantId", val);
  }
  function handleWarehouseChange(val: string): void {
    onChangeField(index, "warehouseId", val);
    onChangeField(index, "locationId", "");
  }
  function handleLocationChange(val: string): void {
    onChangeField(index, "locationId", val);
  }
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>): void {
    onChangeField(index, "qty", e.target.value);
  }
  function handleUnitCostChange(e: React.ChangeEvent<HTMLInputElement>): void {
    onChangeField(index, "unitCost", e.target.value);
  }
  function handleRemove(): void {
    onRemove(index);
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Variant</Label>
          <Select value={line.variantId} onValueChange={handleVariantChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select variant…" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.productName} — {v.sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Warehouse</Label>
          <Select value={line.warehouseId} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Warehouse…" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Location</Label>
          <Select
            value={line.locationId}
            onValueChange={handleLocationChange}
            disabled={!line.warehouseId || locations.length === 0}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Location…" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name} ({l.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Qty</Label>
          <Input
            type="number"
            min="0.0001"
            step="any"
            placeholder="0"
            value={line.qty}
            onChange={handleQtyChange}
            className="h-7 text-xs"
          />
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Unit Cost (optional)</Label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={line.unitCost}
            onChange={handleUnitCostChange}
            className="h-7 text-xs"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={handleRemove}>
          <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </div>
  );
});

export function OpeningStockSheet({ open, onOpenChange }: OpeningStockSheetProps) {
  const [lines, setLines] = useState<LineState[]>([defaultLine()]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const openingMutation = useOpeningStock();

  function handleAddLine(): void {
    setLines((prev) => [...prev, defaultLine()]);
  }

  const handleRemoveLine = useCallback((index: number): void => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChangeField = useCallback((index: number, field: keyof LineState, value: string): void => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }, []);

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setNotes(e.target.value);
  }

  function handleOpenChange(v: boolean): void {
    if (!v) {
      setLines([defaultLine()]);
      setNotes("");
      setErrors([]);
    }
    onOpenChange(v);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setErrors([]);

    const rawLines = lines
      .filter((l) => l.variantId || l.locationId || l.qty)
      .map((l) => ({
        productVariantId: Number(l.variantId),
        locationId: Number(l.locationId),
        qty: Number(l.qty),
        ...(l.unitCost ? { unitCost: Number(l.unitCost) } : {}),
      }));

    const parsed = openingFormSchema.safeParse({
      lines: rawLines,
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      const msgs = parsed.error.issues.map((i) => i.message);
      setErrors([...new Set(msgs)]);
      return;
    }

    openingMutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Opening stock recorded");
        handleOpenChange(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Opening Stock"
      description="Record initial stock balances for products."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-0 h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              {errors.map((e) => (
                <p key={e} className="text-xs text-destructive">{e}</p>
              ))}
            </div>
          )}

          {lines.map((line, index) => (
            <EditableLineRow
              key={index}
              index={index}
              line={line}
              onChangeField={handleChangeField}
              onRemove={handleRemoveLine}
            />
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleAddLine}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add Line
          </Button>

          <div className="space-y-1 pt-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              placeholder="Add notes…"
              value={notes}
              onChange={handleNotesChange}
              maxLength={500}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={openingMutation.isPending || lines.length === 0}
          >
            {openingMutation.isPending ? "Saving…" : "Record Opening Stock"}
          </Button>
        </div>
      </form>
    </AppSheet>
  );
}
