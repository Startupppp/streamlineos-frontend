"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSalesOrder, useProductVariants, useWarehouses } from "@/hooks/api/inventory";

const lineSchema = z.object({
  variantId: z.string().min(1, "Select a variant"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  taxRate: z.string(),
});

const schema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string().min(1, "Select a warehouse"),
  orderDate: z.string().min(1, "Required"),
  expectedShipDate: z.string().optional(),
  currency: z.string(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
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

  const variants: VariantOption[] = variantsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
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

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });

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
    try {
      const result = await createMutation.mutateAsync({
        clientId: values.customerId ? parseInt(values.customerId, 10) : undefined,
        warehouseId: parseInt(values.warehouseId, 10),
        orderDate: values.orderDate,
        requiredDate: values.expectedShipDate || undefined,
        currency: values.currency.trim() || undefined,
        shippingAddress: values.shippingAddress?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((ln) => ({
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
  if (variantsQuery.error) return <ErrorState description={variantsQuery.error.message} onRetry={handleVariantsRetry} />;
  if (warehousesQuery.error) return <ErrorState description={warehousesQuery.error.message} onRetry={handleWarehousesRetry} />;

  const fieldRows: FieldRow[] = fields.map((f, i) => ({ id: f.id, _index: i }));

  const columns: DataTableColumn<FieldRow>[] = [
    {
      key: "variant",
      header: "Product Variant",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row._index}.variantId`}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.productName} – {v.name} ({v.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          control={control}
          name={`lines.${row._index}.quantity`}
          render={({ field: f }) => (
            <Input type="number" min="1" step="1" className="h-8 text-right tabular-nums text-xs" {...f} />
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
          control={control}
          name={`lines.${row._index}.unitPrice`}
          render={({ field: f }) => (
            <Input type="number" min="0" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
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
          control={control}
          name={`lines.${row._index}.taxRate`}
          render={({ field: f }) => (
            <Input type="number" min="0" max="100" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "lineTotal",
      header: "Line Total",
      headerClassName: "text-right w-[110px]",
      className: "text-right font-mono tabular-nums w-[110px]",
      cell: (row) => <SoNewLineAmountCell index={row._index} control={control} />,
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

  return (
    <PageWrapper
      eyebrow="Inventory · Sales Orders"
      title="New Sales Order"
      subtitle="Create a customer sales order. Confirm it to reserve stock."
      backHref="/inventory/sales-orders"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Customer ID (optional)</Label>
              <Input type="number" min="1" {...register("customerId")} placeholder="Leave blank if walk-in" />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="warehouseId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && (
                <p className="text-xs text-destructive mt-1">{errors.warehouseId.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">
                Order Date <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="orderDate"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                )}
              />
              {errors.orderDate && (
                <p className="text-xs text-destructive mt-1">{errors.orderDate.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Expected Ship Date</Label>
              <Controller
                name="expectedShipDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    className="h-8 text-sm"
                    fromDate={parseISO(todayIso())}
                  />
                )}
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Currency</Label>
              <Input {...register("currency")} placeholder="INR" />
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
            minWidth="720px"
            footer={tableFooter}
          />
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Shipping Address</Label>
                <Textarea {...register("shippingAddress")} rows={2} />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Notes</Label>
                <Textarea {...register("notes")} rows={2} />
              </div>
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
    </PageWrapper>
  );
}
