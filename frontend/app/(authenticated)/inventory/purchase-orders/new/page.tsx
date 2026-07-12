"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Store } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
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

type FieldRow = { id: string; _index: number };

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

function PoLineAmountCell({ index, control }: { index: number; control: Control<NewPoFormValues> }) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` });
  const unitCost = useWatch({ control, name: `lines.${index}.unitCost` });
  const amount = round2(num(quantity ?? "") * num(unitCost ?? ""));
  return <span>{amount.toFixed(2)}</span>;
}

interface PoLineVariantCellProps {
  index: number;
  control: Control<NewPoFormValues>;
  variants: ProductVariantFlat[];
  onVariantChangeAt: (index: number, variantId: string, costPrice: string) => void;
}

function PoLineVariantCell({ index, control, variants, onVariantChangeAt }: PoLineVariantCellProps) {
  function handleVariantSelect(value: string): void {
    const variant = variants.find((v) => String(v.id) === value);
    const costPrice = variant ? String(Number(variant.costPrice).toFixed(2)) : "0";
    onVariantChangeAt(index, value, costPrice);
  }

  return (
    <Controller
      control={control}
      name={`lines.${index}.productVariantId`}
      render={({ field }) => (
        <Select value={field.value} onValueChange={handleVariantSelect}>
          <SelectTrigger className="h-8 text-xs">
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
  );
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVendorId = searchParams.get("vendorId") ?? "";

  const vendorsQuery = useVendors({ isActive: true, limit: 100 });
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

  const handleRemoveAt = useCallback((index: number): void => {
    remove(index);
  }, [remove]);

  const handleVariantChangeAt = useCallback((index: number, variantId: string, costPrice: string): void => {
    form.setValue(`lines.${index}.productVariantId`, variantId, { shouldDirty: true });
    form.setValue(`lines.${index}.unitCost`, costPrice, { shouldDirty: true });
  }, [form]);

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
      toast.error(getErrorMessage(error));
    }
  }

  if (vendorsQuery.isLoading || variantsQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorsQuery.error) return <ErrorState description={getErrorMessage(vendorsQuery.error)} onRetry={handleVendorsRetry} />;
  if (variantsQuery.error) return <ErrorState description={getErrorMessage(variantsQuery.error)} onRetry={handleVariantsRetry} />;

  const vendors = vendorsQuery.data?.items ?? [];
  const variants = variantsQuery.data ?? [];

  const fieldRows: FieldRow[] = fields.map((f, i) => ({ id: f.id, _index: i }));

  const columns: DataTableColumn<FieldRow>[] = [
    {
      key: "variant",
      header: "Product / SKU",
      cell: (row) => (
        <PoLineVariantCell
          index={row._index}
          control={form.control}
          variants={variants}
          onVariantChangeAt={handleVariantChangeAt}
        />
      ),
    },
    {
      key: "qty",
      header: "Qty",
      headerClassName: "text-right w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.quantity`}
          render={({ field: f }) => (
            <Input type="number" min="0.0001" step="1" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      headerClassName: "text-right w-[130px]",
      className: "w-[130px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.unitCost`}
          render={({ field: f }) => (
            <Input type="number" min="0" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.taxRate`}
          render={({ field: f }) => (
            <Input type="number" min="0" max="100" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right w-[130px]",
      className: "text-right font-mono tabular-nums w-[130px]",
      cell: (row) => <PoLineAmountCell index={row._index} control={form.control} />,
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-[52px]",
      className: "w-[52px]",
      cell: (row) => {
        function handleRemove(): void {
          handleRemoveAt(row._index);
        }
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRemove}
            disabled={fields.length === 1}
            aria-label={`Remove line ${row._index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        );
      },
    },
  ];

  const tableFooter = (
    <div className="flex items-center justify-between">
      <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
        <Plus className="size-4 mr-1" />
        Add line
      </Button>
    </div>
  );

  const hasNoVendors = vendors.length === 0;

  return (
    <PageWrapper
      eyebrow="Inventory / Purchase Orders"
      title="New purchase order"
      subtitle="Create a PO to order products from a supplier."
      backHref="/inventory/purchase-orders"
    >
      {hasNoVendors && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">No vendors found</p>
            <p className="text-amber-700">
              You need at least one vendor to create a purchase order.{" "}
              <Link href="/inventory/vendors/new" className="underline underline-offset-2 font-medium">
                Create a vendor
              </Link>{" "}
              first.
            </p>
          </div>
        </div>
      )}
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
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
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
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
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
            <div className="space-y-2 p-4 pb-0">
              <Label className="text-[13px] font-medium">
                Lines <span className="text-destructive">*</span>
              </Label>
            </div>
            <DataTable
              data={fieldRows}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="760px"
              footer={tableFooter}
            />
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
            <LoadingButton
              type="submit"
              isPending={createMutation.isPending}
              loadingText="Creating…"
              className="w-full sm:w-auto"
              disabled={hasNoVendors}
            >
              Create PO
            </LoadingButton>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
