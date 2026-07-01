"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { useCreateQuote } from "@/hooks/api/crm/quotes";
import { useProducts } from "@/hooks/api/crm/products";
import type { Product } from "@/types/crm/products";
import type { CreateQuoteInput } from "@/types/crm/quotes";
import { getErrorMessage } from "@/lib/get-error-message";

const lineItemSchema = z.object({
  productId: z.number().optional(),
  productName: z.string().min(1, "Product name required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Must be > 0"),
  unitPrice: z.number().min(0, "Must be >= 0"),
  discount: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

const quoteFormSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  currency: z.enum(["USD", "EUR", "GBP", "INR"]).default("USD"),
  validUntil: z.string().min(1, "Valid until required"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const emptyLineItem = (): QuoteFormValues["lineItems"][number] => ({
  productName: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 0,
});

interface QuoteBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProductSearchPopover({
  index,
  productName,
  onSelect,
}: {
  index: number;
  productName: string;
  onSelect: (index: number, product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data } = useProducts(searchTerm || undefined);
  const products = data?.products ?? [];

  const handleSelect = useCallback(
    (product: Product) => {
      onSelect(index, product);
      setOpen(false);
      setSearchTerm("");
    },
    [index, onSelect],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSearchTerm("");
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm text-left hover:bg-accent transition-colors truncate"
        >
          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{productName || "Search product…"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput
            placeholder="Search products…"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => handleSelect(product)}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{product.name}</span>
                    {product.sku && (
                      <span className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto text-xs font-semibold text-violet-600 shrink-0">
                    {product.currency} {formatCurrency(product.unitPrice)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function QuoteBuilderDialog({
  open,
  onOpenChange,
  dealId,
}: QuoteBuilderDialogProps) {
  const createQuote = useCreateQuote();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      subject: "",
      currency: "USD",
      validUntil: "",
      notes: "",
      lineItems: [emptyLineItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const lineItems = form.watch("lineItems");

  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0,
  );

  const totalDiscount = lineItems.reduce((sum, item) => {
    const base = (item.quantity ?? 0) * (item.unitPrice ?? 0);
    return sum + base * ((item.discount ?? 0) / 100);
  }, 0);

  const totalTax = lineItems.reduce((sum, item) => {
    const base = (item.quantity ?? 0) * (item.unitPrice ?? 0);
    const afterDiscount = base - base * ((item.discount ?? 0) / 100);
    return sum + afterDiscount * ((item.taxRate ?? 0) / 100);
  }, 0);

  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleAddLineItem = useCallback(() => {
    append(emptyLineItem());
  }, [append]);

  const handleRemoveLineItem = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const handleProductSelect = useCallback(
    (index: number, product: Product) => {
      form.setValue(`lineItems.${index}.productId`, product.id);
      form.setValue(`lineItems.${index}.productName`, product.name);
      form.setValue(`lineItems.${index}.description`, product.description ?? "");
      form.setValue(`lineItems.${index}.unitPrice`, product.unitPrice);
      form.setValue(`lineItems.${index}.taxRate`, product.taxRate);
    },
    [form],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        form.reset();
      }
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  const handleSubmit = form.handleSubmit((values) => {
    const input: CreateQuoteInput = {
      dealId,
      subject: values.subject,
      currency: values.currency,
      validUntil: values.validUntil,
      notes: values.notes,
      lineItems: values.lineItems.map((item) => ({
        description: item.productName + (item.description ? ` — ${item.description}` : ""),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
      })),
    };

    createQuote.mutate(input, {
      onSuccess: () => {
        toast.success("Quote created successfully");
        handleOpenChange(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[700px] sm:max-w-[700px] flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">New Quote</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Build a quote for this deal
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form
          id="quote-builder-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="subject" className="text-xs font-medium">
                  Subject <span className="text-red-400">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="subject"
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        id="subject"
                        placeholder="e.g. Enterprise Plan — Q3 2026"
                        className="h-9"
                        {...field}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Currency</Label>
                <Controller
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="validUntil" className="text-xs font-medium">
                  Valid Until <span className="text-red-400">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="validUntil"
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        id="validUntil"
                        type="date"
                        className="h-9"
                        {...field}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Line Items</span>
                {form.formState.errors.lineItems?.root && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.lineItems.root.message}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="grid grid-cols-[1.8fr_0.8fr_0.9fr_0.6fr_0.6fr_0.8fr_2rem] gap-x-2 px-3 py-2 bg-slate-50 border-b border-slate-200/80">
                  <span className="text-[11px] font-medium text-muted-foreground">Product</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Description</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Unit Price</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Qty</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Disc %</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Tax %</span>
                  <span />
                </div>

                <div className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {fields.map((field, index) => {
                      const item = lineItems[index];
                      const base = (item?.quantity ?? 0) * (item?.unitPrice ?? 0);
                      const afterDiscount = base - base * ((item?.discount ?? 0) / 100);
                      const lineTotal = afterDiscount + afterDiscount * ((item?.taxRate ?? 0) / 100);

                      return (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="grid grid-cols-[1.8fr_0.8fr_0.9fr_0.6fr_0.6fr_0.8fr_2rem] gap-x-2 px-3 py-2.5 items-start"
                        >
                          <div className="space-y-1 min-w-0">
                            <ProductSearchPopover
                              index={index}
                              productName={form.watch(`lineItems.${index}.productName`)}
                              onSelect={handleProductSelect}
                            />
                            {form.formState.errors.lineItems?.[index]?.productName && (
                              <p className="text-[10px] text-destructive">
                                {form.formState.errors.lineItems[index].productName?.message}
                              </p>
                            )}
                          </div>

                          <Controller
                            control={form.control}
                            name={`lineItems.${index}.description`}
                            render={({ field: f }) => (
                              <Input
                                {...f}
                                placeholder="Details"
                                className="h-8 text-xs"
                              />
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`lineItems.${index}.unitPrice`}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                className="h-8 text-xs"
                                value={f.value}
                                onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={0.01}
                                step={0.01}
                                placeholder="1"
                                className="h-8 text-xs"
                                value={f.value}
                                onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`lineItems.${index}.discount`}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="0"
                                className="h-8 text-xs"
                                value={f.value}
                                onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />

                          <div className="space-y-1 min-w-0">
                            <Controller
                              control={form.control}
                              name={`lineItems.${index}.taxRate`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  placeholder="0"
                                  className="h-8 text-xs"
                                  value={f.value}
                                  onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                            <p className="text-[10px] text-muted-foreground text-right">
                              {formatCurrency(lineTotal)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            disabled={fields.length === 1}
                            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line Item
              </Button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Discount</span>
                <span className="font-medium text-amber-600">
                  {totalDiscount > 0 ? `− ${formatCurrency(totalDiscount)}` : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Tax</span>
                <span className="font-medium">{formatCurrency(totalTax)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold text-violet-700">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">
                Notes
              </Label>
              <Controller
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes for this quote…"
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </form>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quote-builder-form"
            disabled={createQuote.isPending}
            className="flex-1 h-9 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            {createQuote.isPending ? "Creating…" : "Create Quote"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
