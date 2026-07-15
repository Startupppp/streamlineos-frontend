"use client";

import { memo, useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useProductVariants, useWarehouses } from "@/hooks/api/inventory";
import { useUpdateSalesOrder, type SalesOrderDetail } from "@/hooks/api/inventory/sales-orders";
import { getErrorMessage } from "@/lib/get-error-message";

const lineSchema = z.object({
  variantId: z.string().min(1, "Select a variant"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  taxRate: z.string(),
});

const schema = z.object({
  orderDate: z.string().min(1, "Required"),
  requiredDate: z.string().optional(),
  warehouseId: z.string().optional(),
  currency: z.string(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

type FieldRow = { id: string; index: number };

function toNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function SoLineAmountCell({ index, control }: { index: number; control: Control<FormValues> }) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` });
  const unitPrice = useWatch({ control, name: `lines.${index}.unitPrice` });
  const taxRate = useWatch({ control, name: `lines.${index}.taxRate` });
  const sub = round2(toNum(quantity ?? "") * toNum(unitPrice ?? ""));
  const lineTotal = round2(sub + round2(sub * (toNum(taxRate ?? "") / 100)));
  return <span>{lineTotal.toFixed(2)}</span>;
}

interface SoEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soId: number;
  so: SalesOrderDetail;
}

export function SoEditSheet({ open, onOpenChange, soId, so }: SoEditSheetProps) {
  const variantsQuery = useProductVariants({ activeOnly: true });
  const warehousesQuery = useWarehouses();
  const updateMutation = useUpdateSalesOrder();

  const variants = variantsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      orderDate: so.orderDate ?? "",
      requiredDate: so.expectedShipDate ?? "",
      warehouseId: so.warehouseId ? String(so.warehouseId) : "",
      currency: so.currency ?? "INR",
      shippingAddress: so.shippingAddress ?? "",
      notes: so.notes ?? "",
      lines: so.lines.map((l) => ({
        variantId: String(l.productId),
        quantity: String(parseFloat(l.quantity)),
        unitPrice: String(parseFloat(l.unitPrice)),
        taxRate: l.taxRate ? String(parseFloat(l.taxRate)) : "0",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  function handleAddLine(): void {
    append({ variantId: "", quantity: "1", unitPrice: "0", taxRate: "0" });
  }

  const handleRemoveAt = useCallback((index: number): void => {
    remove(index);
  }, [remove]);

  function handleClose(): void {
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  const watchedLines = useWatch({ control, name: "lines" });

  const grandTotal = useMemo(() => {
    return round2(
      (watchedLines ?? []).reduce((acc, ln) => {
        const sub = round2(toNum(ln?.quantity ?? "") * toNum(ln?.unitPrice ?? ""));
        const tax = round2(sub * (toNum(ln?.taxRate ?? "") / 100));
        return acc + round2(sub + tax);
      }, 0),
    );
  }, [watchedLines]);

  const lineColumns = useMemo((): DataTableColumn<FieldRow>[] => [
    {
      key: "variantId",
      header: "Variant",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.variantId`}
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
      headerClassName: "text-right",
      className: "w-[80px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.quantity`}
          render={({ field: f }) => (
            <Input type="number" min="1" step="1" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      headerClassName: "text-right",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.unitPrice`}
          render={({ field: f }) => (
            <Input type="number" min="0" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right",
      className: "w-[80px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.taxRate`}
          render={({ field: f }) => (
            <Input type="number" min="0" max="100" step="0.01" className="h-8 text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-xs text-right font-mono tabular-nums w-[90px]",
      cell: (row) => <SoLineAmountCell index={row.index} control={control} />,
    },
    {
      key: "remove",
      header: "",
      className: "w-[40px]",
      cell: (row) => {
        function handleRemove(): void {
          handleRemoveAt(row.index);
        }
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRemove}
            disabled={fields.length === 1}
            aria-label={`Remove line ${row.index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        );
      },
    },
  ], [control, variants, fields.length, handleRemoveAt]);

  const lineTableData: FieldRow[] = fields.map((f, i) => ({ id: f.id, index: i }));

  const tableFooter = (
    <div className="text-right text-sm font-medium">
      Total: <span className="font-mono tabular-nums">{grandTotal.toFixed(2)}</span>
    </div>
  );

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        soId,
        orderDate: values.orderDate,
        requiredDate: values.requiredDate || undefined,
        warehouseId: values.warehouseId ? parseInt(values.warehouseId, 10) : undefined,
        currency: values.currency.trim() || undefined,
        shippingAddress: values.shippingAddress?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((ln) => ({
          productVariantId: parseInt(ln.variantId, 10),
          quantity: toNum(ln.quantity),
          unitPrice: toNum(ln.unitPrice),
          taxRate: toNum(ln.taxRate) || undefined,
        })),
      });
      toast.success("Sales order updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>Edit Sales Order</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SheetBody className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">
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
                  <p className="text-xs text-destructive">{errors.orderDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Required Date</Label>
                <Controller
                  name="requiredDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Warehouse</Label>
                <Controller
                  control={control}
                  name="warehouseId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Keep current" />
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Currency</Label>
                <Input {...register("currency")} placeholder="INR" className="h-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Shipping Address</Label>
              <Textarea {...register("shippingAddress")} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Notes</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">
                  Lines <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddLine}>
                  <Plus className="size-3.5 mr-1" />
                  Add line
                </Button>
              </div>
              <DataTable
                data={lineTableData}
                columns={lineColumns}
                getRowKey={(row) => row.id}
                footer={tableFooter}
              />
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <LoadingButton type="submit" isPending={updateMutation.isPending} loadingText="Saving…" className="flex-1">
              Save Changes
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
