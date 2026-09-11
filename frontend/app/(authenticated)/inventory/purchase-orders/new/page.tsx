"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useVendors, useProductVariants, useCreatePurchaseOrder } from "@/hooks/api/inventory";
import { OrderLineTable } from "@/features/inventory/components/order-line-table";
import { newPoSchema, type NewPoFormValues } from "@/features/inventory/lib/po-schema";
import { toNum, round2 } from "@/features/inventory/lib/order-line-helpers";
import type { CreatePurchaseOrderInput, CreatePoLineInput } from "@/types/inventory";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewPurchaseOrderPage() {
  const canCreate = useCan("inventory:purchase-orders:create");
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
      lines: [{ variantId: "", quantity: "1", unitCost: "0", taxRate: "0" }],
    },
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const totals = useMemo(() => {
    const lineData = (watchedLines ?? []).map((l) => {
      const qty = toNum(l?.quantity ?? "");
      const cost = toNum(l?.unitCost ?? "");
      const taxRate = toNum(l?.taxRate ?? "");
      const amount = round2(qty * cost);
      const tax = round2(amount * (taxRate / 100));
      return { amount, tax };
    });
    const subtotal = round2(lineData.reduce((acc, l) => acc + l.amount, 0));
    const taxTotal = round2(lineData.reduce((acc, l) => acc + l.tax, 0));
    const total = round2(subtotal + taxTotal);
    return { subtotal, taxTotal, total };
  }, [watchedLines]);

  const handleVariantChangeAt = useCallback((index: number, variantId: string, costPrice: string): void => {
    form.setValue(`lines.${index}.variantId`, variantId, { shouldDirty: true });
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
    const validLines = values.lines.filter((l) => l.variantId && toNum(l.quantity) > 0);
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
        productVariantId: Number(l.variantId),
        quantity: toNum(l.quantity),
        unitCost: toNum(l.unitCost),
        taxRate: toNum(l.taxRate),
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

  const vendors = vendorsQuery.data?.items ?? [];
  const variantsData = variantsQuery.data;
  const variants = useMemo(() => variantsData ?? [], [variantsData]);

  const orderLineVariants = useMemo(
    () => variants.map((v) => ({
      id: v.id,
      productName: v.productName,
      name: v.name ?? "",
      sku: v.sku,
      costPrice: v.costPrice,
    })),
    [variants],
  );

  if (vendorsQuery.isLoading || variantsQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorsQuery.error) return <ErrorState description={getErrorMessage(vendorsQuery.error)} onRetry={handleVendorsRetry} />;
  if (variantsQuery.error) return <ErrorState description={getErrorMessage(variantsQuery.error)} onRetry={handleVariantsRetry} />;

  const totalsFooter = (
    <div className="flex justify-end mt-2">
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
  );

  // G8. A create form is not a list, so it has no empty state — but it can
  // still be opened by somebody who may not save, and letting them fill it
  // in before the server refuses is the worst version of that. Placed after
  // every hook: an early return above one makes hook order depend on a
  // permission, which React forbids.
  if (!canCreate) {
    return (
      <PageWrapper title="New Purchase Order">
        <NoPermissionState permission="inventory:purchase-orders:create" className="flex-1" />
      </PageWrapper>
    );
  }

  if (vendors.length === 0)
    return (
      <PageWrapper title="New purchase order" backHref="/inventory/purchase-orders">
        <InventoryEmptyState
          illustrationPreset="companies"
          title="No vendors yet"
          description="A purchase order is raised against a supplier, so you need at least one vendor before you can create one."
          action={{ label: "Add a vendor", href: "/inventory/vendors" }}
        />
      </PageWrapper>
    );

  if (orderLineVariants.length === 0)
    return (
      <PageWrapper title="New purchase order" backHref="/inventory/purchase-orders">
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="Nothing to order yet"
          description="A purchase order needs at least one product line, and your catalogue is empty."
          action={{ label: "Add a product", href: "/inventory/products/new" }}
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="New purchase order"
      subtitle="Create a PO to order products from a supplier."
      backHref="/inventory/purchase-orders"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
                        <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
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
                        <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
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
                        <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
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
                <Label className="text-label font-medium">
                  Lines <span className="text-destructive">*</span>
                </Label>
              </div>
              <OrderLineTable
                variants={orderLineVariants}
                mode="po"
                onVariantChange={handleVariantChangeAt}
                footer={totalsFooter}
                minWidth="760px"
              />
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
              >
                Create PO
              </LoadingButton>
            </div>
          </form>
        </Form>
      </div>
    </PageWrapper>
  );
}
