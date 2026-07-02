"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/shared";
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

export default function NewSalesOrderPage() {
  const router = useRouter();
  const variantsQuery = useProductVariants({ activeOnly: true });
  const warehousesQuery = useWarehouses();
  const createMutation = useCreateSalesOrder();

  const variants = variantsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    watch,
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
  const watchedLines = watch("lines");

  const lineTotals = useMemo(
    () =>
      watchedLines.map((ln) => {
        const sub = round2(toNum(ln.quantity) * toNum(ln.unitPrice));
        const taxAmt = round2(sub * (toNum(ln.taxRate) / 100));
        return round2(sub + taxAmt);
      }),
    [watchedLines],
  );

  const grandTotal = round2(lineTotals.reduce((acc, t) => acc + t, 0));

  function handleAddLine(): void {
    append({ variantId: "", quantity: "1", unitPrice: "0", taxRate: "0" });
  }

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
        customerId: values.customerId ? parseInt(values.customerId, 10) : undefined,
        warehouseId: parseInt(values.warehouseId, 10),
        orderDate: values.orderDate,
        expectedShipDate: values.expectedShipDate || undefined,
        currency: values.currency.trim() || undefined,
        shippingAddress: values.shippingAddress?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((ln) => ({
          productId: parseInt(ln.variantId, 10),
          quantity: toNum(ln.quantity),
          unitPrice: toNum(ln.unitPrice),
          taxRate: toNum(ln.taxRate) || undefined,
        })),
      });
      toast.success(`Sales order ${result.soNumber} created`);
      router.push(`/inventory/sales-orders/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sales order");
    }
  }

  const isLoading = variantsQuery.isLoading || warehousesQuery.isLoading;
  if (isLoading) return <LoadingState variant="form" />;
  if (variantsQuery.error) return <ErrorState description={variantsQuery.error.message} onRetry={handleVariantsRetry} />;
  if (warehousesQuery.error) return <ErrorState description={warehousesQuery.error.message} onRetry={handleWarehousesRetry} />;

  return (
    <PageWrapper
      eyebrow="Inventory · Sales Orders"
      title="New Sales Order"
      subtitle="Create a customer sales order. Confirm it to reserve stock."
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
              <Input type="date" {...register("orderDate")} />
              {errors.orderDate && (
                <p className="text-xs text-destructive mt-1">{errors.orderDate.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Expected Ship Date</Label>
              <Input type="date" min={todayIso()} {...register("expectedShipDate")} />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Currency</Label>
              <Input {...register("currency")} placeholder="INR" />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product Variant</TableHead>
                  <TableHead className="text-right w-[90px]">Qty</TableHead>
                  <TableHead className="text-right w-[110px]">Unit Price</TableHead>
                  <TableHead className="text-right w-[90px]">Tax %</TableHead>
                  <TableHead className="text-right w-[110px]">Line Total</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`lines.${index}.variantId`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger>
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
                      {errors.lines?.[index]?.variantId && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.lines[index].variantId?.message}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        {...register(`lines.${index}.quantity`)}
                        className="text-right tabular-nums"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`lines.${index}.unitPrice`)}
                        className="text-right tabular-nums"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        {...register(`lines.${index}.taxRate`)}
                        className="text-right tabular-nums"
                      />
                    </TableCell>

                    <TableCell className="text-right tabular-nums text-sm">
                      {(lineTotals[index] ?? 0).toFixed(2)}
                    </TableCell>

                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
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

            <div className="space-y-1 text-sm tabular-nums">
              {lineTotals.map((total, index) => (
                <div key={fields[index]?.id ?? index} className="flex justify-between text-muted-foreground">
                  <span>Line {index + 1}</span>
                  <span>{total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-medium text-base">
                <span>Grand Total</span>
                <span>{grandTotal.toFixed(2)}</span>
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
          <Button
            type="submit"
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Sales Order"}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}
