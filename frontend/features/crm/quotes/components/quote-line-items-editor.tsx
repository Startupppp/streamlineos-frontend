"use client";

import { useCallback } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { QuoteCreateFormValues } from "./quote-create-sheet";

const EMPTY_LINE_ITEM = { description: "", quantity: "1", unitPrice: "0", taxRate: "0" };

interface QuoteLineItemsEditorProps {
  control: Control<QuoteCreateFormValues>;
  rootError?: string;
}

export function QuoteLineItemsEditor({ control, rootError }: QuoteLineItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  const handleAdd = useCallback(() => { append(EMPTY_LINE_ITEM); }, [append]);

  const handleRemove = useCallback(
    (index: number) => { remove(index); },
    [remove],
  );

  return (
    <div className="space-y-2">
      <FormLabel>Line Items</FormLabel>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">
                Description
              </th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-20">
                Qty
              </th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-28">
                Unit Price
              </th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-20">
                Tax %
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.map((field, index) => (
              <tr key={field.id}>
                <td className="px-3 py-1.5">
                  <FormField
                    control={control}
                    name={`lineItems.${index}.description`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input placeholder="Description" className="text-xs" {...f} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <FormField
                    control={control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input type="number" min="0.01" step="0.01" className="text-xs" {...f} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <FormField
                    control={control}
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input type="number" min="0" step="0.01" className="text-xs" {...f} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <FormField
                    control={control}
                    name={`lineItems.${index}.taxRate`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input type="number" min="0" max="100" step="0.01" className="text-xs" {...f} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rootError && <p className="text-sm text-destructive">{rootError}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={handleAdd}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Line Item
      </Button>
    </div>
  );
}
