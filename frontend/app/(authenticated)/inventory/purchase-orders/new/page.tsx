"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingState, ErrorState } from "@/components/shared";
import { useVendors, useProductVariants, useCreatePurchaseOrder } from "@/hooks/api/inventory";
import type { CreatePurchaseOrderInput, CreatePoLineInput, ProductVariantFlat } from "@/types/inventory";

const poLineSchema = z.object({
  productVariantId: z.string(),
  quantity: z.string(),
  unitCost: z.string(),
  taxRate: z.string(),
});

const newPoSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string(),
  notes: z.string(),
  lines: z.array(poLineSchema),
});

type NewPoFormValues = z.infer<typeof newPoSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PoLineRowProps {
  index: number;
  control: Control<NewPoFormValues>;
  variants: ProductVariantFlat[];
  isOnly: boolean;
  onRemoveAt: (index: number) => void;
  onVariantChangeAt: (index: number, variantId: string, costPrice: string) => void;
}

function PoLineRow({ index, control, variants, isOnly, onRemoveAt, onVariantChangeAt }: PoLineRowProps) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` });
  const unitCost = useWatch({ control, name: `lines.${index}.unitCost` });
  const amount = round2(num(quantity ?? "") * num(unitCost ?? ""));

  function handleVariantSelect(value: string): void {
    const variant = variants.find((v) => String(v.id) === value);
    const costPrice = variant ? String(Number(variant.costPrice).toFixed(2)) : "0";
    onVariantChangeAt(index, value, costPrice);
  }

  function handleRemove(): void {
    onRemoveAt(index);
  }

  return (
    <TableRow>
      <TableCell>
        <FormField
          control={control}
          name={`lines.${index}.productVariantId`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={handleVariantSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.productName} — {v.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <FormField
          control={control}
          name={`lines.${index}.quantity`}
          render={({ field }) => (
            <Input
              type="number"
              min="0.0001"
              step="1"
              className="text-right tabular-nums"
              {...field}
            />
          )}
        />
      </TableCell>
      <TableCell>
        <FormField
          control={control}
          name={`lines.${index}.unitCost`}
          render={({ field }) => (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="text-right tabular-nums"
              {...field}
            />
          )}
        />
      </TableCell>
      <TableCell>
        <FormField
          control={control}
          name={`lines.${index}.taxRate`}
          render={({ field }) => (
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="text-right tabular-nums"
              {...field}
            />
          )}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {amount.toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isOnly}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVendorId = searchParams.get("vendorId") ?? "";

  const vendorsQuery = useVendors({ isActive: true, limit: 200 });
  const variantsQuery = useProductVariants({ activeOnly: true });
  const createMutation = useCreatePurchaseOrder();

  const form = useForm<NewPoFormValues>({
    resolver: zodResolver(newPoSchema),
    defaultValues: {
      vendorId: preselectedVendorId,
      orderDate: todayIso(),
      expectedDeliveryDate: "",
      notes: "",
      lines: [{ productVariantId: "", quantity: "1", unitCost: "0", taxRate: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const totals = useMemo(() => {
    const lineData = (watchedLines ?? []).map((l) => {
      const qty = num(l?.quantity ?? "");
      const cost = num(l?.unitCost ?? "");
      const taxRate = num(l?.taxRate ?? "");
      const amount = round2(qty * cost);
      const tax = round2(amount * (taxRate / 100));
      return { amount, tax };
    });
    const subtotal = round2(lineData.reduce((acc, l) => acc + l.amount, 0));
    const taxTotal = round2(lineData.reduce((acc, l) => acc + l.tax, 0));
    const total = round2(subtotal + taxTotal);
    return { subtotal, taxTotal, total };
  }, [watchedLines]);

  function handleAddLine(): void {
    append({ productVariantId: "", quantity: "1", unitCost: "0", taxRate: "0" });
  }

  function handleRemoveAt(index: number): void {
    remove(index);
  }

  function handleVariantChangeAt(index: number, variantId: string, costPrice: string): void {
    form.setValue(`lines.${index}.productVariantId`, variantId, { shouldDirty: true });
    form.setValue(`lines.${index}.unitCost`, costPrice, { shouldDirty: true });
  }

  function handleCancel(): void {
    router.push("/inventory/purchase-orders");
  }

  function handleVendorsRetry(): void {
    void vendorsQuery.refetch();
  }

  function handleVariantsRetry(): void {
    void variantsQuery.refetch();
  }

  async function onSubmit(values: NewPoFormValues): Promise<void> {
    const validLines = values.lines.filter((l) => l.productVariantId && num(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one product line");
      return;
    }

    const payload: CreatePurchaseOrderInput = {
      vendorId: Number(values.vendorId),
      orderDate: values.orderDate,
      expectedDeliveryDate: values.expectedDeliveryDate || undefined,
      notes: values.notes.trim() || undefined,
      lines: validLines.map<CreatePoLineInput>((l, idx) => ({
        productVariantId: Number(l.productVariantId),
        quantity: num(l.quantity),
        unitCost: num(l.unitCost),
        taxRate: num(l.taxRate),
        lineOrder: idx,
      })),
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success(`PO ${result.poNumber} created`);
      router.push(`/inventory/purchase-orders/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase order");
    }
  }

  if (vendorsQuery.isLoading || variantsQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorsQuery.error) return <ErrorState description={vendorsQuery.error.message} onRetry={handleVendorsRetry} />;
  if (variantsQuery.error) return <ErrorState description={variantsQuery.error.message} onRetry={handleVariantsRetry} />;

  const vendors = vendorsQuery.data?.items ?? [];
  const variants = variantsQuery.data ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory · Purchase Orders"
      title="New purchase order"
      subtitle="Create a PO to order products from a supplier."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected delivery</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-3">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Any special instructions"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead className="text-right w-[100px]">Qty</TableHead>
                    <TableHead className="text-right w-[130px]">Unit cost</TableHead>
                    <TableHead className="text-right w-[100px]">Tax %</TableHead>
                    <TableHead className="text-right w-[130px]">Amount</TableHead>
                    <TableHead className="w-[52px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <PoLineRow
                      key={field.id}
                      index={index}
                      control={form.control}
                      variants={variants}
                      isOnly={fields.length === 1}
                      onRemoveAt={handleRemoveAt}
                      onVariantChangeAt={handleVariantChangeAt}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="size-4 mr-1" />
                Add line
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex justify-end">
              <div className="space-y-1 text-sm tabular-nums w-64">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{totals.taxTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span>{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create PO"}
            </Button>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
