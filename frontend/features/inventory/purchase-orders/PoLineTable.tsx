"use client";

import { useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProductVariants } from "@/lib/api/hooks/inventory";
import type { ProductVariantFlat } from "@/types/inventory";

export interface PoLineFormValues {
  productVariantId: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
}

export interface PoFormValues {
  lines: PoLineFormValues[];
}

function computeAmount(quantity: string, unitCost: string, taxRate: string): number {
  const qty = parseFloat(quantity) || 0;
  const cost = parseFloat(unitCost) || 0;
  const tax = parseFloat(taxRate) || 0;
  const subtotal = qty * cost;
  return subtotal + (subtotal * tax) / 100;
}

export function PoLineTable() {
  const form = useFormContext<PoFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: variants = [] } = useProductVariants({ activeOnly: true });

  const handleAddRow = useCallback(() => {
    append({ productVariantId: "", quantity: "1", unitCost: "0", taxRate: "0" });
  }, [append]);

  const handleRemoveRow = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );

  const lines = form.watch("lines") ?? [];

  const grandTotal = lines.reduce(
    (sum, line) => sum + computeAmount(line.quantity, line.unitCost, line.taxRate),
    0
  );

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Product</TableHead>
              <TableHead className="w-24">Quantity</TableHead>
              <TableHead className="w-28">Unit Cost</TableHead>
              <TableHead className="w-24">Tax %</TableHead>
              <TableHead className="w-28 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const line = lines[index];
              const amount = line
                ? computeAmount(line.quantity, line.unitCost, line.taxRate)
                : 0;

              return (
                <TableRow key={field.id}>
                  <TableCell className="py-1.5">
                    <Select
                      value={form.watch(`lines.${index}.productVariantId`)}
                      onValueChange={(val) =>
                        form.setValue(`lines.${index}.productVariantId`, val, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((v: ProductVariantFlat) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.productName} — {v.name} ({v.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8 text-xs"
                      {...form.register(`lines.${index}.quantity`)}
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-xs"
                      {...form.register(`lines.${index}.unitCost`)}
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="h-8 text-xs"
                      {...form.register(`lines.${index}.taxRate`)}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-sm tabular-nums">
                    {amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(index)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {fields.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No lines added. Click Add line to begin.
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted/40 font-medium">
              <TableCell colSpan={4} className="text-xs text-right pr-4">
                Total
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {grandTotal.toFixed(2)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={handleAddRow}
      >
        <Plus className="h-3.5 w-3.5" />
        Add line
      </Button>
    </div>
  );
}
