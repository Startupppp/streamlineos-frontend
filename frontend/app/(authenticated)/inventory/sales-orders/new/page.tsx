"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSalesOrder, useProductVariants, useWarehouses } from "@/hooks/api/inventory";
import { OrderLineTable } from "@/features/inventory/components/order-line-table";
import { newSoSchema, type NewSoFormValues } from "@/features/inventory/lib/so-schema";
import { toNum, round2 } from "@/features/inventory/lib/order-line-helpers";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidVariantName(name: string): boolean {
  return name.trim().length > 0 && !/^[\s\W\d]+$/.test(name.trim());
}

export default function NewSalesOrderPage() {
  const canCreate = useCan("inventory:sales-orders:create");
  const router = useRouter();
  const variantsQuery = useProductVariants({ activeOnly: true });
  const warehousesQuery = useWarehouses();
  const createMutation = useCreateSalesOrder();

  const allVariants = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data]);
  const allWarehouses = useMemo(() => warehousesQuery.data?.items ?? [], [warehousesQuery.data]);

  const variants = useMemo(
    () => allVariants.filter((v) => isValidVariantName(v.productName)),
    [allVariants],
  );

  const warehouses = useMemo(
    () => allWarehouses.filter((w) => w.isActive),
    [allWarehouses],
  );

  const orderLineVariants = useMemo(
    () => variants.map((v) => ({
      id: v.id,
      productName: v.productName,
      name: v.name ?? "",
      sku: v.sku,
    })),
    [variants],
  );

  const form = useForm<NewSoFormValues>({
    resolver: zodResolver(newSoSchema),
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

  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const { lineTotals, grandTotal } = useMemo(() => {
    const totals = (watchedLines ?? []).map((ln) => {
      const sub = round2(toNum(ln?.quantity ?? "") * toNum(ln?.unitPrice ?? ""));
      const taxAmt = round2(sub * (toNum(ln?.taxRate ?? "") / 100));
      return round2(sub + taxAmt);
    });
    return { lineTotals: totals, grandTotal: round2(totals.reduce((acc, t) => acc + t, 0)) };
  }, [watchedLines]);

  function handleCancel(): void {
    router.back();
  }

  function handleVariantsRetry(): void {
    void variantsQuery.refetch();
  }

  function handleWarehousesRetry(): void {
    void warehousesQuery.refetch();
  }

  async function onSubmit(values: NewSoFormValues): Promise<void> {
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

  const summaryFooter = (
    <div className="flex justify-end mt-2">
      <div className="space-y-1 text-sm w-64">
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
  );

  // G8. A create form is not a list, so it has no empty state — but it can
  // still be opened by somebody who may not save, and letting them fill it
  // in before the server refuses is the worst version of that. Placed after
  // every hook: an early return above one makes hook order depend on a
  // permission, which React forbids.
  if (!canCreate) {
    return (
      <PageWrapper title="New Sales Order">
        <NoPermissionState permission="inventory:sales-orders:create" className="flex-1" />
      </PageWrapper>
    );
  }

  if (warehouses.length === 0)
    return (
      <PageWrapper title="New Sales Order" backHref="/inventory/sales-orders">
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="No active warehouses"
          description="Stock is shipped from a warehouse, so you need an active one before an order can be raised."
          action={{ label: "Set up a warehouse", href: "/inventory/warehouses" }}
        />
      </PageWrapper>
    );

  if (orderLineVariants.length === 0)
    return (
      <PageWrapper title="New Sales Order" backHref="/inventory/sales-orders">
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="Nothing to sell yet"
          description="A sales order needs at least one product line, and your catalogue is empty."
          action={{ label: "Add a product", href: "/inventory/products/new" }}
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="New Sales Order"
      subtitle="Create a customer sales order. Confirm it to reserve stock."
      backHref="/inventory/sales-orders"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
                        <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
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
                <p className="text-label font-medium">
                  Lines <span className="text-destructive">*</span>
                </p>
              </div>
              <OrderLineTable
                variants={orderLineVariants}
                mode="so"
                footer={summaryFooter}
                minWidth="720px"
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
      </div>
    </PageWrapper>
  );
}
