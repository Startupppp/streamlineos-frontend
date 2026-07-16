"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parseISO } from "date-fns";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSalesOrder, useProductVariants, useWarehouses } from "@/hooks/api/inventory";

const lineSchema = z.object({
  variantId: z.string().min(1, "Select a product variant"),
  quantity: z.string().refine(
    (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0; },
    { message: "Quantity must be greater than 0" },
  ),
  unitPrice: z.string().refine(
    (v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0; },
    { message: "Unit price must be 0 or greater" },
  ),
  taxRate: z.string().refine(
    (v) => { const n = parseFloat(v); return !v || (Number.isFinite(n) && n >= 0 && n <= 100); },
    { message: "Tax rate must be between 0 and 100" },
  ),
});

const schema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedShipDate: z.string().optional(),
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters"),
  shippingAddress: z.string().max(500, "Address must be at most 500 characters").optional(),
  notes: z.string().max(2000, "Notes must be at most 2000 characters").optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line item"),
});

type FormValues = z.infer<typeof schema>;

type FieldRow = { id: string; _index: number };

type VariantOption = { id: number; productName: string; name: string; sku: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidVariantName(name: string): boolean {
  return name.trim().length > 0 && !/^[\s\W\d]+$/.test(name.trim());
}

function truncateLabel(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function SoNewLineAmountCell({ index, control }: { index: number; control: Control<FormValues> }) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` });
  const unitPrice = useWatch({ control, name: `lines.${index}.unitPrice` });
  const taxRate = useWatch({ control, name: `lines.${index}.taxRate` });
  const sub = round2(toNum(quantity ?? "") * toNum(unitPrice ?? ""));
  const lineTotal = round2(sub + round2(sub * (toNum(taxRate ?? "") / 100)));
  return <span>{lineTotal.toFixed(2)}</span>;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const variantsQuery = useProductVariants({ activeOnly: true });
  const warehousesQuery = useWarehouses();
  const createMutation = useCreateSalesOrder();

  const allVariants: VariantOption[] = variantsQuery.data ?? [];
  const allWarehouses = warehousesQuery.data ?? [];

  const variants = useMemo(
    () => allVariants.filter((v) => isValidVariantName(v.productName)),
    [allVariants],
  );

  const warehouses = useMemo(
    () => allWarehouses.filter((w) => w.isActive),
    [allWarehouses],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: "",
      warehouseId: "",
      orderDate: todayIso(),
      expectedShipDate: "",
      currency: "INR",
      shippingAddress: "",
      notes: "",
      lines: [{ variantId: "", quantity: "1", unitPrice: "0", taxRate: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const { lineTotals, grandTotal } = useMemo(() => {
    const totals = (watchedLines ?? []).map((ln) => {
      const sub = round2(toNum(ln?.quantity ?? "") * toNum(ln?.unitPrice ?? ""));
      const taxAmt = round2(sub * (toNum(ln?.taxRate ?? "") / 100));
      return round2(sub + taxAmt);
    });
    return { lineTotals: totals, grandTotal: round2(totals.reduce((acc, t) => acc + t, 0)) };
  }, [watchedLines]);

  function handleAddLine(): void {
    append({ variantId: "", quantity: "1", unitPrice: "0", taxRate: "0" });
  }

  const handleRemoveAt = useCallback((index: number): void => {
    remove(index);
  }, [remove]);

  function handleCancel(): void {
    router.back();
  }

  function handleVariantsRetry(): void {
    void variantsQuery.refetch();
  }

  function handleWarehousesRetry(): void {
    void warehousesQuery.refetch();
  }

  async function onSubmit(values: FormValues): Promise<void> {
    const validLines = values.lines.filter(
      (ln) => ln.variantId && toNum(ln.quantity) > 0,
    );
    if (validLines.length === 0) {
      toast.error("Add at least one product line with a valid quantity");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        clientId: values.customerId ? parseInt(values.customerId, 10) : undefined,
        warehouseId: parseInt(values.warehouseId, 10),
        orderDate: values.orderDate,
        requiredDate: values.expectedShipDate || undefined,
        currency: values.currency.trim() || undefined,
        shippingAddress: values.shippingAddress?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        lines: validLines.map((ln) => ({
          productVariantId: parseInt(ln.variantId, 10),
          quantity: toNum(ln.quantity),
          unitPrice: toNum(ln.unitPrice),
          taxRate: toNum(ln.taxRate) > 0 ? toNum(ln.taxRate) : undefined,
        })),
      });
      toast.success(`Sales order ${result.soNumber} created`);
      router.push(`/inventory/sales-orders/${result.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isLoading = variantsQuery.isLoading || warehousesQuery.isLoading;
  if (isLoading) return <LoadingState variant="form" />;
  if (variantsQuery.error) return <ErrorState description={getErrorMessage(variantsQuery.error)} onRetry={handleVariantsRetry} />;
  if (warehousesQuery.error) return <ErrorState description={getErrorMessage(warehousesQuery.error)} onRetry={handleWarehousesRetry} />;

  const fieldRows: FieldRow[] = fields.map((f, i) => ({ id: f.id, _index: i }));

  const columns: DataTableColumn<FieldRow>[] = [
    {
      key: "variant",
      header: "Product / SKU",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.variantId`}
          render={({ field: f, fieldState }) => (
            <div>
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger className={`h-8 text-xs ${fieldState.error ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {variants.map((v) => {
                    const label = `${v.productName} – ${v.name} (${v.sku})`;
                    return (
                      <SelectItem key={v.id} value={String(v.id)} title={label}>
                        {truncateLabel(label, 50)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right w-[90px]",
      className: "w-[90px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.quantity`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0.0001"
                step="1"
                className={`h-8 text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      headerClassName: "text-right w-[110px]",
      className: "w-[110px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.unitPrice`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0"
                step="0.01"
                className={`h-8 text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right w-[90px]",
      className: "w-[90px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`lines.${row._index}.taxRate`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={`h-8 text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "lineTotal",
      header: "Line Total",
      headerClassName: "text-right w-[110px]",
      className: "text-right font-mono tabular-nums w-[110px]",
      cell: (row) => <SoNewLineAmountCell index={row._index} control={form.control} />,
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-[50px]",
      className: "w-[50px]",
      cell: (row) => {
        function handleRemove(): void {
          handleRemoveAt(row._index);
        }
        return (
          <AnimatedIconButton
            type="button"
            icon={Trash2Icon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleRemove}
            disabled={fields.length === 1}
            aria-label={`Remove line ${row._index + 1}`}
          />
        );
      },
    },
  ];

  const tableFooter = (
    <div className="flex items-center justify-between">
      <AnimatedIconButton type="button" icon={PlusIcon} iconSize={14} iconClassName="mr-1" variant="outline" size="sm" onClick={handleAddLine}>
        Add line
      </AnimatedIconButton>
    </div>
  );

  return (
    <PageWrapper
      title="New Sales Order"
      subtitle="Create a customer sales order. Confirm it to reserve stock."
      backHref="/inventory/sales-orders"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer ID <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Leave blank if walk-in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>
                            {w.name} ({w.code})
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
                    <FormLabel>Order Date *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedShipDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Ship Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Pick a date"
                        className="text-sm"
                        fromDate={parseISO(todayIso())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="INR" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="space-y-2 p-4 pb-0">
              <p className="text-[13px] font-medium">
                Lines <span className="text-destructive">*</span>
              </p>
            </div>
            <DataTable
              data={fieldRows}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="720px"
              footer={tableFooter}
            />
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="shippingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea rows={2} className="resize-none" {...field} />
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
                        <Textarea rows={2} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-1 text-sm">
                {lineTotals.map((total, index) => (
                  <div key={fields[index]?.id ?? index} className="flex justify-between text-muted-foreground">
                    <span>Line {index + 1}</span>
                    <span className="font-mono tabular-nums">{total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-medium text-base">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums">{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isPending={createMutation.isPending}
              loadingText="Creating…"
              className="w-full sm:w-auto"
            >
              Create Sales Order
            </LoadingButton>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
