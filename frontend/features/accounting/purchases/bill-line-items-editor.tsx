"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { FieldArrayWithId } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GST_RATES, num, round2 } from "./bill-form-schemas";
import type { NewBillFormValues } from "./bill-form-schemas";

interface BillLineItemsEditorProps {
  fields: FieldArrayWithId<NewBillFormValues, "items">[];
  watchedItems: NewBillFormValues["items"];
  onAddItem: () => void;
  onRemoveItemAt: (index: number) => () => void;
}

export function BillLineItemsEditor({
  fields,
  watchedItems,
  onAddItem,
  onRemoveItemAt,
}: BillLineItemsEditorProps) {
  const form = useFormContext<NewBillFormValues>();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">HSN/SAC</TableHead>
              <TableHead className="text-right w-[100px]">Qty</TableHead>
              <TableHead className="text-right w-[120px]">Rate</TableHead>
              <TableHead className="w-[100px]">GST %</TableHead>
              <TableHead className="text-right w-[120px]">Amount</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const qty = num(watchedItems[index]?.quantity ?? "0");
              const rate = num(watchedItems[index]?.rate ?? "0");
              const amount = round2(qty * rate);
              return (
                <TableRow key={field.id}>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <Input {...f} placeholder="What is this for?" />
                          {fieldState.error && (
                            <p className="text-xs text-destructive mt-0.5">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.hsnSacCode`}
                      render={({ field: f }) => <Input {...f} />}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...f}
                            className="text-right tabular-nums"
                          />
                          {fieldState.error && (
                            <p className="text-xs text-destructive mt-0.5">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.rate`}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...f}
                            className="text-right tabular-nums"
                          />
                          {fieldState.error && (
                            <p className="text-xs text-destructive mt-0.5">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={form.control}
                      name={`items.${index}.gstRate`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onRemoveItemAt(index)}
                      disabled={fields.length <= 1}
                      aria-label="Remove line item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="size-4 mr-1" />
          Add line
        </Button>
      </div>
    </Card>
  );
}
