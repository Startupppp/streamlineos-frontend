"use client";

import { useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useProductVariants, useVendors } from "@/hooks/api/inventory";
import { useUpdatePurchaseOrder } from "@/hooks/api/inventory/purchase-orders";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PurchaseOrder } from "@/types/inventory";

const lineSchema = z.object({
  variantId: z.string().min(1, "Select a variant"),
  quantity: z.string().min(1),
  unitCost: z.string().min(1),
  taxRate: z.string(),
});

const schema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Required"),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

type FieldRow = { id: string; index: number };

interface RemoveLineButtonProps {
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

function RemoveLineButton({ index, disabled, onRemove }: RemoveLineButtonProps) {
  function handleClick(): void {
    onRemove(index);
  }
  return (
    <AnimatedIconButton
      type="button"
      icon={Trash2Icon}
      iconSize={14}
      variant="ghost"
      size="icon"
      className="w-7"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Remove line ${index + 1}`}
    />
  );
}

function toNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function LineAmountCell({ index, control }: { index: number; control: Control<FormValues> }) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` });
  const unitCost = useWatch({ control, name: `lines.${index}.unitCost` });
  const amount = round2(toNum(quantity ?? "") * toNum(unitCost ?? ""));
  return <span>{amount.toFixed(2)}</span>;
}

interface PoEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder;
}

export function PoEditSheet({ open, onOpenChange, po }: PoEditSheetProps) {
  const variantsQuery = useProductVariants({ activeOnly: true });
  const vendorsQuery = useVendors({ isActive: true, limit: 100 });
  const updateMutation = useUpdatePurchaseOrder(po.id);

  const variants = variantsQuery.data ?? [];
  const vendors = vendorsQuery.data?.items ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      vendorId: po.vendor ? String(po.vendor.id) : "",
      orderDate: po.orderDate ?? "",
      expectedDeliveryDate: po.expectedDeliveryDate ?? "",
      notes: po.notes ?? "",
      lines: po.lines.map((l) => ({
        variantId: String(l.productVariant?.id ?? ""),
        quantity: String(parseFloat(l.quantity)),
        unitCost: String(parseFloat(l.unitCost)),
        taxRate: l.taxRate ? String(parseFloat(l.taxRate)) : "0",
      })),
    },
  });

  const { control, handleSubmit, reset } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const fieldRows: FieldRow[] = useMemo(
    () => fields.map((f, i) => ({ id: f.id, index: i })),
    [fields],
  );

  function handleAddLine(): void {
    append({ variantId: "", quantity: "1", unitCost: "0", taxRate: "0" });
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

  const totals = useMemo(() => {
    const subtotal = round2(
      (watchedLines ?? []).reduce((acc, ln) => {
        return acc + round2(toNum(ln?.quantity ?? "") * toNum(ln?.unitCost ?? ""));
      }, 0),
    );
    return { subtotal };
  }, [watchedLines]);

  const columns = useMemo<DataTableColumn<FieldRow>[]>(() => [
    {
      key: "variant",
      header: "Variant",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.variantId`}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.productName} — {v.name} ({v.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      ),
    },
    {
      key: "qty",
      header: "Qty",
      headerClassName: "text-right w-[80px]",
      className: "w-[80px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.quantity`}
          render={({ field: f }) => (
            <Input type="number" min="0.0001" step="1" className="text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      headerClassName: "text-right w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.unitCost`}
          render={({ field: f }) => (
            <Input type="number" min="0" step="0.01" className="text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right w-[80px]",
      className: "w-[80px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.taxRate`}
          render={({ field: f }) => (
            <Input type="number" min="0" max="100" step="0.01" className="text-right tabular-nums text-xs" {...f} />
          )}
        />
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right w-[90px]",
      className: "text-right font-mono tabular-nums w-[90px]",
      cell: (row) => <LineAmountCell index={row.index} control={control} />,
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-[40px]",
      className: "w-[40px]",
      cell: (row) => (
        <RemoveLineButton
          index={row.index}
          disabled={fields.length === 1}
          onRemove={handleRemoveAt}
        />
      ),
    },
  ], [control, variants, fields.length, handleRemoveAt]);

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        poId: po.id,
        vendorId: parseInt(values.vendorId, 10),
        orderDate: values.orderDate,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((ln) => ({
          productVariantId: parseInt(ln.variantId, 10),
          quantity: toNum(ln.quantity),
          unitCost: toNum(ln.unitCost),
          taxRate: toNum(ln.taxRate) || undefined,
        })),
      });
      toast.success("Purchase order updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>Edit Purchase Order</SheetTitle>
        </SheetHeader>
        <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SheetBody className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor <span className="text-destructive">*</span></FormLabel>
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
                control={control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[13px] font-medium">
                  Lines <span className="text-destructive">*</span>
                </FormLabel>
                <AnimatedIconButton type="button" icon={PlusIcon} iconSize={14} iconClassName="mr-1" variant="outline" size="sm" className="text-xs" onClick={handleAddLine}>
                  Add line
                </AnimatedIconButton>
              </div>
              <DataTable
                data={fieldRows}
                columns={columns}
                getRowKey={(row) => row.id}
                footer={
                  <div className="text-right text-sm font-medium">
                    Subtotal: <span className="font-mono tabular-nums">{totals.subtotal.toFixed(2)}</span>
                  </div>
                }
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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
