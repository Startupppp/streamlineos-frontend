"use client";

import { useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Quote, QuoteLineItem } from "@/types/crm/quotes";

const lineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.string().min(1, "Required"),
  unitPrice: z.string().min(1, "Required"),
  taxRate: z.string().optional(),
});

const quoteFormSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  description: z.string().optional(),
  currency: z.string(),
  validUntil: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  pricebookId: z.string().optional(),
  templateId: z.string().optional(),
  discountPercent: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export type QuoteCreateFormValues = z.infer<typeof quoteFormSchema>;

export interface QuoteSubmitValues {
  subject: string;
  description?: string;
  currency: string;
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  pricebookId?: string;
  templateId?: string;
  discountPercent?: number;
  dealId?: number;
  clientId?: number;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>;
}

interface QuoteSettings {
  maxDiscountPercent: number | null;
  requirePricebookPrice: boolean;
  defaultExpiryDays: number;
  allowPriceOverride: boolean;
}

interface QuoteCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: Quote | null;
  dealId?: number;
  clientId?: number;
  isPending: boolean;
  onSubmit: (values: QuoteSubmitValues) => void;
  quoteSettings?: QuoteSettings;
  pricebooks?: Array<{ id: string; name: string; currency: string }>;
  quoteTemplates?: Array<{ id: string; name: string }>;
}

function defaultExpiryDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function mapLineItem(item: QuoteLineItem) {
  return {
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    taxRate: String(item.taxRate),
  };
}

const EMPTY_LINE_ITEM = { description: "", quantity: "1", unitPrice: "0", taxRate: "0" };

export function QuoteCreateSheet({
  open,
  onOpenChange,
  editTarget,
  dealId,
  clientId,
  isPending,
  onSubmit,
  quoteSettings,
  pricebooks,
  quoteTemplates,
}: QuoteCreateSheetProps) {
  const resetCalledRef = useRef(false);

  const buildDefaultValues = useCallback((): QuoteCreateFormValues => ({
    subject: "",
    description: "",
    currency: "INR",
    validUntil: quoteSettings ? defaultExpiryDate(quoteSettings.defaultExpiryDays) : "",
    termsAndConditions: "",
    notes: "",
    pricebookId: undefined,
    templateId: undefined,
    discountPercent: undefined,
    lineItems: [EMPTY_LINE_ITEM],
  }), [quoteSettings]);

  const form = useForm<QuoteCreateFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: buildDefaultValues(),
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
        pricebookId: editTarget.pricebookId ?? undefined,
        templateId: editTarget.templateId ?? undefined,
        discountPercent: undefined,
        lineItems:
          editTarget.lineItems && editTarget.lineItems.length > 0
            ? editTarget.lineItems.map(mapLineItem)
            : [EMPTY_LINE_ITEM],
      });
    } else {
      form.reset(buildDefaultValues());
    }

    return () => {
      resetCalledRef.current = false;
    };
  }, [editTarget, form, buildDefaultValues]);

  const watchedItems = form.watch("lineItems");
  const currency = form.watch("currency");
  const watchedDiscount = form.watch("discountPercent");
  const watchedPricebookId = form.watch("pricebookId");

  const discountNum = Number(watchedDiscount) || 0;
  const selectedPricebook = pricebooks?.find((pb) => pb.id === watchedPricebookId);

  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const taxTotal = watchedItems.reduce((sum, item) => {
    const line = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + line * ((Number(item.taxRate) || 0) / 100);
  }, 0);
  const discountAmt = subtotal * (discountNum / 100);
  const grandTotal = subtotal - discountAmt + taxTotal;

  const exceedsMaxDiscount =
    quoteSettings?.maxDiscountPercent !== null &&
    quoteSettings?.maxDiscountPercent !== undefined &&
    discountNum > quoteSettings.maxDiscountPercent;

  const handleSubmit = useCallback(
    (values: QuoteCreateFormValues) => {
      const converted: QuoteSubmitValues = {
        subject: values.subject,
        description: values.description || undefined,
        currency: values.currency,
        validUntil: values.validUntil || undefined,
        termsAndConditions: values.termsAndConditions || undefined,
        notes: values.notes || undefined,
        pricebookId: values.pricebookId || undefined,
        templateId: values.templateId || undefined,
        discountPercent: values.discountPercent ? Number(values.discountPercent) : undefined,
        dealId,
        clientId,
        lineItems: values.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
        })),
      };
      onSubmit(converted);
    },
    [onSubmit, dealId, clientId],
  );

  const handleAddLineItem = useCallback(() => {
    append(EMPTY_LINE_ITEM);
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

              {(pricebooks && pricebooks.length > 0) || (quoteTemplates && quoteTemplates.length > 0) ? (
                <div className="grid grid-cols-2 gap-4">
                  {pricebooks && pricebooks.length > 0 && (
                    <FormField
                      control={form.control}
                      name="pricebookId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pricebook</FormLabel>
                          <Select
                            value={field.value ?? "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select pricebook" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No pricebook</SelectItem>
                              {pricebooks.map((pb) => (
                                <SelectItem key={pb.id} value={pb.id}>
                                  {pb.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPricebook && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Prices from: {selectedPricebook.name}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {quoteTemplates && quoteTemplates.length > 0 && (
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template</FormLabel>
                          <Select
                            value={field.value ?? "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No template</SelectItem>
                              {quoteTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ) : null}

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
                                    <Input placeholder="Description" className="h-7 text-xs" {...f} />
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
                                    <Input type="number" min="0.01" step="0.01" className="h-7 text-xs" {...f} />
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
                                    <Input type="number" min="0" step="0.01" className="h-7 text-xs" {...f} />
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
                                    <Input type="number" min="0" max="100" step="0.01" className="h-7 text-xs" {...f} />
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
                <FormMessage>{form.formState.errors.lineItems?.root?.message}</FormMessage>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      {exceedsMaxDiscount && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                          <p className="text-[10px] text-amber-700 font-medium">
                            Requires approval (max {quoteSettings?.maxDiscountPercent}%)
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

            <div className="border-t shrink-0 px-6 py-4 space-y-2">
              <div className="flex flex-col gap-0.5 items-end text-xs tabular-nums font-mono">
                <span className="text-muted-foreground">
                  Subtotal: {currency} {subtotal.toFixed(2)}
                </span>
                {discountAmt > 0 && (
                  <span className="text-amber-700">
                    Discount: -{currency} {discountAmt.toFixed(2)}
                  </span>
                )}
                <span className="text-muted-foreground">
                  Tax: {currency} {taxTotal.toFixed(2)}
                </span>
                <span className="font-semibold text-foreground text-sm">
                  Total: {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3 justify-end pt-2">
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
