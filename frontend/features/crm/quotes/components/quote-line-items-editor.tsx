"use client";

import { useCallback } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import {
  FormControl,
  FormItem,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { QuoteCreateFormValues } from "./quote-create-schema";


const EMPTY_LINE_ITEM = { description: "", quantity: "1", unitPrice: "0", taxRate: "0" };

interface QuoteLineItemsEditorProps {
  control: Control<QuoteCreateFormValues>;
  rootError?: string;
}

interface RemoveLineItemButtonProps {
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

function RemoveLineItemButton({ index, disabled, onRemove }: RemoveLineItemButtonProps) {
  const handleClick = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 text-destructive hover:text-destructive"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Remove line item ${index + 1}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

export function QuoteLineItemsEditor({ control, rootError }: QuoteLineItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  const handleAdd = useCallback(() => {
    append(EMPTY_LINE_ITEM);
  }, [append]);

  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  return (
    <div className="flex flex-col gap-2">
      <FormLabel>Line items</FormLabel>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Unit price</TableHead>
              <TableHead className="w-20">Tax %</TableHead>
              <TableHead className="w-8">
                <span className="sr-only">Remove</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>
                  <FormField
                    control={control}
                    name={`lineItems.${index}.description`}
                    render={({ field: input }) => (
                      <FormItem className="gap-1">
                        <FormControl>
                          <Input placeholder="Description" className="text-xs" {...input} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field: input }) => (
                      <FormItem className="gap-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="text-xs"
                            {...input}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={control}
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field: input }) => (
                      <FormItem className="gap-1">
                        <FormControl>
                          <Input type="number" min="0" step="0.01" className="text-xs" {...input} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={control}
                    name={`lineItems.${index}.taxRate`}
                    render={({ field: input }) => (
                      <FormItem className="gap-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="text-xs"
                            {...input}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <RemoveLineItemButton
                    index={index}
                    disabled={fields.length === 1}
                    onRemove={handleRemove}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rootError ? <p className="text-sm text-destructive">{rootError}</p> : null}

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleAdd}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add line item
      </Button>
    </div>
  );
}
