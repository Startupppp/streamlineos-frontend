"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCreateAdjustment } from "@/lib/api/hooks/inventory/stock";

type AdjustmentReason =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRY"
  | "THEFT"
  | "RECOUNT"
  | "OTHER";

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGE: "Damage",
  EXPIRY: "Expiry",
  THEFT: "Theft",
  RECOUNT: "Recount",
  OTHER: "Other",
};

interface AdjustmentLine {
  productVariantId: string;
  locationId: string;
  quantityChange: string;
  notes: string;
}

function buildEmptyLine(): AdjustmentLine {
  return { productVariantId: "", locationId: "", quantityChange: "", notes: "" };
}

interface StockAdjustmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockAdjustmentSheet({ open, onOpenChange, onSuccess }: StockAdjustmentSheetProps) {
  const mutation = useCreateAdjustment();

  const [reason, setReason] = useState<AdjustmentReason | "">("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<AdjustmentLine[]>([buildEmptyLine()]);

  function resetForm(): void {
    setReason("");
    setNotes("");
    setLines([buildEmptyLine()]);
  }

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) resetForm();
      onOpenChange(value);
    },
    [onOpenChange]
  );

  const handleReasonChange = useCallback((value: string) => {
    setReason(value as AdjustmentReason);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleAddLine = useCallback(() => {
    setLines((prev) => [...prev, buildEmptyLine()]);
  }, []);

  const handleRemoveLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleLineChange = useCallback(
    (index: number, field: keyof AdjustmentLine, value: string) => {
      setLines((prev) =>
        prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      toast.error("Select a reason for the adjustment");
      return;
    }

    const validLines = lines.filter(
      (l) => l.productVariantId.trim() && l.locationId.trim() && l.quantityChange.trim()
    );

    if (validLines.length === 0) {
      toast.error("Add at least one line with a product, location, and quantity");
      return;
    }

    const invalidLine = validLines.find(
      (l) => Number.isNaN(Number(l.quantityChange)) || Number(l.quantityChange) === 0
    );
    if (invalidLine) {
      toast.error("Quantity change must be a non-zero number");
      return;
    }

    try {
      await Promise.all(
        validLines.map((line) => {
          const qty = Number(line.quantityChange);
          return mutation.mutateAsync({
            warehouseId: 0,
            productId: Number(line.productVariantId),
            locationId: line.locationId ? Number(line.locationId) : undefined,
            adjustmentType: qty > 0 ? "IN" : "OUT",
            quantity: Math.abs(qty),
            reason,
            notes: line.notes.trim() || (notes.trim() || undefined),
          });
        })
      );

      toast.success("Stock adjustment saved");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save adjustment";
      toast.error(message);
    }
  }, [reason, notes, lines, mutation, onSuccess, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border/60 text-left gap-1 px-6 py-4">
          <SheetTitle className="text-base font-semibold">Stock adjustment</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Record manual inventory adjustments across one or more products.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason" className="text-sm">
                Reason
              </Label>
              <Select value={reason} onValueChange={handleReasonChange}>
                <SelectTrigger id="adj-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REASON_LABELS) as AdjustmentReason[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {REASON_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-notes" className="text-sm">
                Notes
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Textarea
                id="adj-notes"
                placeholder="General notes for this adjustment"
                rows={2}
                value={notes}
                onChange={handleNotesChange}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lines</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add line
                </Button>
              </div>

              {lines.map((line, index) => (
                <div
                  key={index}
                  className="rounded-md border border-border/60 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Line {index + 1}
                    </p>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveLine(index)}
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`adj-variant-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Product Variant ID
                      </Label>
                      <Input
                        id={`adj-variant-${index}`}
                        type="number"
                        min="1"
                        placeholder="e.g. 42"
                        className="h-8 text-sm"
                        value={line.productVariantId}
                        onChange={(e) => handleLineChange(index, "productVariantId", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`adj-location-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Location ID
                      </Label>
                      <Input
                        id={`adj-location-${index}`}
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        className="h-8 text-sm"
                        value={line.locationId}
                        onChange={(e) => handleLineChange(index, "locationId", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`adj-qty-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Quantity change
                      </Label>
                      <Input
                        id={`adj-qty-${index}`}
                        type="number"
                        placeholder="e.g. -10 or 25"
                        className="h-8 text-sm"
                        value={line.quantityChange}
                        onChange={(e) => handleLineChange(index, "quantityChange", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`adj-line-notes-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Line notes
                        <span className="ml-1">(optional)</span>
                      </Label>
                      <Input
                        id={`adj-line-notes-${index}`}
                        placeholder="Optional"
                        className="h-8 text-sm"
                        value={line.notes}
                        onChange={(e) => handleLineChange(index, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
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
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save adjustment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
