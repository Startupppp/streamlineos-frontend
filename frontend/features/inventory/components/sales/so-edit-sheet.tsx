"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { useProductVariants } from "@/hooks/api/inventory";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { useUpdateSalesOrder, type SalesOrderDetail } from "@/hooks/api/inventory/sales-orders";
import { getErrorMessage } from "@/lib/get-error-message";
import { OrderLineTable } from "@/features/inventory/components/order-line-table";
import { soEditSchema, type SoEditFormValues } from "@/features/inventory/lib/so-schema";
import { toNum, round2 } from "@/features/inventory/lib/order-line-helpers";

interface SoEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soId: number;
  so: SalesOrderDetail;
}

export function SoEditSheet({ open, onOpenChange, soId, so }: SoEditSheetProps) {
  const variantsQuery = useProductVariants({ activeOnly: true });
  const updateMutation = useUpdateSalesOrder();

  const variants = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data]);

  const orderLineVariants = useMemo(
    () => variants.map((v) => ({
      id: v.id,
      productName: v.productName,
      name: v.name ?? "",
      sku: v.sku,
    })),
    [variants],
  );

  const form = useForm<SoEditFormValues>({
    resolver: zodResolver(soEditSchema),
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

  const { control, handleSubmit, reset } = form;

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

  const tableFooter = (
    <div className="text-right text-sm font-medium mt-1">
      Total: <span className="font-mono tabular-nums">{grandTotal.toFixed(2)}</span>
    </div>
  );

  async function onSubmit(values: SoEditFormValues): Promise<void> {
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
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  name="requiredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Date</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse</FormLabel>
                      <FormControl>
                        <WarehouseSelect
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          ariaLabel="Warehouse"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
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
              </div>
              <FormField
                control={control}
                name="shippingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Address</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <FormLabel className="text-label font-medium">
                  Lines <span className="text-destructive">*</span>
                </FormLabel>
                <OrderLineTable
                  variants={orderLineVariants}
                  mode="so"
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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
