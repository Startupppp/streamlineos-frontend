"use client";

import { useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Quote, QuoteLineItem } from "@/types/crm/quotes";

const lineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
});

const quoteFormSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  description: z.string().optional(),
  currency: z.string().default("INR"),
  validUntil: z.string().min(1, "Expiry date required"),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export type QuoteCreateFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: Quote | null;
  dealId?: number;
  clientId?: number;
  isPending: boolean;
  onSubmit: (values: QuoteCreateFormValues & { dealId?: number; clientId?: number }) => void;
}

const defaultValues: QuoteCreateFormValues = {
  subject: "",
  description: "",
  currency: "INR",
  validUntil: "",
  termsAndConditions: "",
  notes: "",
  lineItems: [{ description: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
};

function mapLineItem(item: QuoteLineItem) {
  return {
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxRate: Number(item.taxRate),
  };
}

export function QuoteCreateSheet({
  open,
  onOpenChange,
  editTarget,
  dealId,
  clientId,
  isPending,
  onSubmit,
}: QuoteCreateSheetProps) {
  const resetCalledRef = useRef(false);

  const form = useForm<QuoteCreateFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    if (resetCalledRef.current) return;
    resetCalledRef.current = true;

    if (editTarget) {
      form.reset({
        subject: editTarget.subject,
        description: editTarget.description ?? "",
        currency: editTarget.currency,
        validUntil: editTarget.validUntil ? editTarget.validUntil.slice(0, 10) : "",
        termsAndConditions: editTarget.termsAndConditions ?? "",
        notes: editTarget.notes ?? "",
        lineItems:
          editTarget.lineItems && editTarget.lineItems.length > 0
            ? editTarget.lineItems.map(mapLineItem)
            : defaultValues.lineItems,
      });
    } else {
      form.reset(defaultValues);
    }

    return () => {
      resetCalledRef.current = false;
    };
  }, [editTarget, form]);

  const watchedItems = form.watch("lineItems");
  const currency = form.watch("currency");

  const grandTotal = watchedItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const tax = Number(item.taxRate) || 0;
    const line = qty * price;
    return sum + line + line * (tax / 100);
  }, 0);

  const handleSubmit = useCallback(
    (values: QuoteCreateFormValues) => {
      onSubmit({ ...values, dealId, clientId });
    },
    [onSubmit, dealId, clientId],
  );

  const handleAddLineItem = useCallback(() => {
    append({ description: "", quantity: 1, unitPrice: 0, taxRate: 0 });
  }, [append]);

  const handleRemoveLineItem = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-2xl">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{editTarget ? "Edit Quote" : "New Quote"}</SheetTitle>
          <SheetDescription>
            {editTarget
              ? "Update the details of this quote."
              : "Fill in the details to create a new quote."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Quote subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="INR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                              control={form.control}
                              name={`lineItems.${index}.description`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      placeholder="Description"
                                      className="h-7 text-xs"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.quantity`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      className="h-7 text-xs"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.unitPrice`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="h-7 text-xs"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.taxRate`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className="h-7 text-xs"
                                      {...f}
                                    />
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
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveLineItem(index)}
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
                <FormMessage>
                  {form.formState.errors.lineItems?.root?.message}
                </FormMessage>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddLineItem}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Line Item
                </Button>
              </div>

              <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional terms and conditions"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal notes"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t shrink-0 grid grid-cols-2 px-6 py-4 gap-3 items-center">
              <p className="text-sm font-semibold tabular-nums">
                Total: {currency} {grandTotal.toFixed(2)}
              </p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending} loadingText="Saving...">
                  {editTarget ? "Update Quote" : "Create Quote"}
                </LoadingButton>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
