"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { VendorSelect } from "@/components/inventory/vendor-select";
import { useUpdatePurchaseOrder } from "@/hooks/api/inventory/purchase-orders";
import { getErrorMessage } from "@/lib/get-error-message";
import { OrderLineTable } from "@/features/inventory/components/order-line-table";
import { poEditSchema, type PoEditFormValues } from "@/features/inventory/lib/po-schema";
import { toNum, round2 } from "@/features/inventory/lib/order-line-helpers";
import type { LocalPurchaseOrder } from "@/hooks/api/inventory/purchase-orders";

interface PoEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: LocalPurchaseOrder;
}

export function PoEditSheet({ open, onOpenChange, po }: PoEditSheetProps) {
  const variantsQuery = useProductVariants({ activeOnly: true });
  const updateMutation = useUpdatePurchaseOrder(po.id);

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

  const form = useForm<PoEditFormValues>({
    resolver: zodResolver(poEditSchema),
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

  function handleClose(): void {
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  const watchedLines = useWatch({ control, name: "lines" });

  const subtotal = useMemo(() => {
    return round2(
      (watchedLines ?? []).reduce((acc, ln) => {
        return acc + round2(toNum(ln?.quantity ?? "") * toNum(ln?.unitCost ?? ""));
      }, 0),
    );
  }, [watchedLines]);

  const tableFooter = (
    <div className="text-right text-sm font-medium mt-1">
      Subtotal: <span className="font-mono tabular-nums">{subtotal.toFixed(2)}</span>
    </div>
  );

  async function onSubmit(values: PoEditFormValues): Promise<void> {
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
                      <FormControl>
                        <VendorSelect
                          value={field.value}
                          onChange={field.onChange}
                          activeOnly
                        />
                      </FormControl>
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
                <FormLabel className="text-label font-medium">
                  Lines <span className="text-destructive">*</span>
                </FormLabel>
                <OrderLineTable
                  variants={orderLineVariants}
                  mode="po"
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
