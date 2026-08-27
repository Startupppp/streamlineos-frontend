"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useVendors } from "@/hooks/api/inventory/vendors";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateVendorReturn } from "@/hooks/api/inventory/operations";
import { usePurchaseOrders } from "@/hooks/api/inventory/purchase-orders";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { getErrorMessage } from "@/lib/get-error-message";

const RETURN_REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "EXCESS", label: "Excess" },
  { value: "EXPIRED", label: "Expired" },
  { value: "QUALITY_REJECTED", label: "Quality Rejected" },
] as const;

const lineSchema = z.object({
  productVariantId: z.number({ error: "Required" }).int().positive(),
  locationId: z.number({ error: "Required" }).int().positive(),
  quantity: z.number({ error: "Required" }).positive(),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXCESS", "EXPIRED", "QUALITY_REJECTED"]),
  unitCost: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.number({ error: "Vendor is required" }).int().positive(),
  poId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1, "At least one line is required"),
});

type FormValues = z.infer<typeof formSchema>;

export interface VendorReturnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RemoveLineButtonProps {
  index: number;
  onRemove: (index: number) => void;
}

function RemoveLineButton({ index, onRemove }: RemoveLineButtonProps) {
  function handleClick(): void {
    onRemove(index);
  }

  return (
    <AnimatedIconButton
      type="button"
      icon={Trash2Icon}
      iconSize={12}
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-destructive"
      aria-label="Remove return line"
      onClick={handleClick}
    />
  );
}

export function VendorReturnSheet({ open, onOpenChange }: VendorReturnSheetProps) {
  const vendorsQuery = useVendors({ isActive: true, limit: 100 });
  const warehousesQuery = useWarehouses();
  const createMutation = useCreateVendorReturn();
  const purchaseOrdersQuery = usePurchaseOrders({ pageSize: 100 });
  const variantsQuery = useProductVariants({ activeOnly: true });

  const poOptions: ComboboxOption[] = (purchaseOrdersQuery.data?.items ?? []).map((po) => ({
    value: String(po.id),
    label: po.poNumber,
    sublabel: po.vendor?.name,
  }));

  const variantOptions: ComboboxOption[] = (variantsQuery.data ?? []).map((v) => ({
    value: String(v.id),
    label: v.sku,
    sublabel: `${v.productName} — ${v.name}`,
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      lines: [{ productVariantId: 0, locationId: 0, quantity: 1, reason: "DAMAGED", unitCost: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(0);

  const locationsQuery = useLocations(selectedWarehouseId);
  const activeLocations = (locationsQuery.data ?? []).filter((l) => l.isActive);

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  function handleAddLine(): void {
    append({ productVariantId: 0, locationId: 0, quantity: 1, reason: "DAMAGED", unitCost: "" });
  }

  function handleRemoveLine(index: number): void {
    if (fields.length > 1) remove(index);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        vendorId: values.vendorId,
        poId: values.poId,
        notes: values.notes?.trim() || undefined,
        lines: values.lines.map((l) => ({
          productVariantId: l.productVariantId,
          locationId: l.locationId,
          quantity: l.quantity,
          reason: l.reason,
          unitCost: l.unitCost?.trim() || undefined,
        })),
      });
      toast.success("Vendor return created");
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Vendor Return"
      description="Create a return merchandise authorization for a vendor."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="vendor-return-form"
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create Return
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form id="vendor-return-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor *</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={vendorsQuery.isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    {(vendorsQuery.data?.items ?? []).map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="poId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Order (optional)</FormLabel>
                <FormControl>
                  <Combobox
                    options={poOptions}
                    value={field.value ? String(field.value) : ""}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    placeholder="Search purchase orders…"
                    searchPlaceholder="Search by PO number…"
                    emptyText="No purchase orders found"
                    disabled={purchaseOrdersQuery.isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <label className="text-sm font-medium">Warehouse (for locations)</label>
            <Select
              value={selectedWarehouseId ? String(selectedWarehouseId) : ""}
              onValueChange={(v) => setSelectedWarehouseId(Number(v))}
              disabled={warehousesQuery.isLoading}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehousesQuery.data ?? []).map((wh) => (
                  <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Return Lines</span>
              <AnimatedIconButton type="button" icon={PlusIcon} iconSize={12} iconClassName="mr-1" variant="outline" size="sm" className="text-xs" onClick={handleAddLine}>
                Add Line
              </AnimatedIconButton>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-border/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Line {index + 1}</span>
                  {fields.length > 1 && (
                    <RemoveLineButton index={index} onRemove={handleRemoveLine} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.productVariantId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Product Variant *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={variantOptions}
                            value={f.value ? String(f.value) : ""}
                            onChange={(val) => f.onChange(val ? Number(val) : 0)}
                            placeholder="Search variants…"
                            searchPlaceholder="Search by SKU…"
                            emptyText="No variants found"
                            disabled={variantsQuery.isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={f.value || ""}
                            onChange={(e) => f.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.locationId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Location *</FormLabel>
                        <Select
                          value={f.value ? String(f.value) : ""}
                          onValueChange={(v) => f.onChange(Number(v))}
                          disabled={locationsQuery.isLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {activeLocations.map((loc) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>
                                {loc.name} ({loc.code})
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
                    name={`lines.${index}.reason`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Reason *</FormLabel>
                        <Select value={f.value} onValueChange={f.onChange}>
                          <FormControl>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RETURN_REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`lines.${index}.unitCost`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Unit Cost (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Any notes for this return" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
