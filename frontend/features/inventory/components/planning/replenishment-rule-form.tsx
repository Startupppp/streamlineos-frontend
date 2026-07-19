"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSheet } from "@/components/shared";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useVendors } from "@/hooks/api/inventory/vendors";
import {
  useCreateReplenishmentRule,
  useUpdateReplenishmentRule,
  type ReplenishmentRule,
} from "@/hooks/api/inventory/planning";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

const SENTINEL = "__none__";

const ruleSchema = z
  .object({
    variantId: z.string().min(1, "Product variant is required"),
    warehouseId: z.string().min(1, "Warehouse is required"),
    minQty: z.string().min(1, "Min qty is required"),
    maxQty: z.string().min(1, "Max qty is required"),
    reorderQty: z.string().min(1, "Reorder qty is required"),
    safetyStock: z.string(),
    leadTimeDays: z.string(),
    vendorId: z.string(),
  })
  .superRefine((data, ctx) => {
    const min = Number(data.minQty);
    const max = Number(data.maxQty);
    if (!Number.isFinite(min) || min < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Min qty must be a positive number", path: ["minQty"] });
    }
    if (!Number.isFinite(max) || max < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Max qty must be a positive number", path: ["maxQty"] });
    }
    if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Max qty must be ≥ min qty", path: ["maxQty"] });
    }
  });

type RuleFormValues = z.infer<typeof ruleSchema>;

interface ReplenishmentRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: ReplenishmentRule;
}

function toFormDefaults(rule?: ReplenishmentRule): RuleFormValues {
  if (!rule) {
    return {
      variantId: "",
      warehouseId: "",
      minQty: "",
      maxQty: "",
      reorderQty: "",
      safetyStock: "",
      leadTimeDays: "",
      vendorId: SENTINEL,
    };
  }
  return {
    variantId: String(rule.variantId),
    warehouseId: String(rule.warehouseId),
    minQty: String(rule.minQty),
    maxQty: String(rule.maxQty),
    reorderQty: String(rule.reorderQty),
    safetyStock: rule.safetyStock != null ? String(rule.safetyStock) : "",
    leadTimeDays: rule.leadTimeDays != null ? String(rule.leadTimeDays) : "",
    vendorId: rule.vendorId != null ? String(rule.vendorId) : SENTINEL,
  };
}

export function ReplenishmentRuleForm({ open, onOpenChange, editRule }: ReplenishmentRuleFormProps) {
  const create = useCreateReplenishmentRule();
  const update = useUpdateReplenishmentRule();
  const { data: warehouses = [] } = useWarehouses();
  const { data: variants = [] } = useProductVariants({ activeOnly: true });
  const { data: vendorsPage } = useVendors();
  const vendors = vendorsPage?.items ?? [];

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: toFormDefaults(editRule),
  });

  useEffect(() => {
    form.reset(toFormDefaults(editRule));
  }, [editRule, open, form]);

  function handleOpenChange(next: boolean): void {
    if (!next) form.reset(toFormDefaults(editRule));
    onOpenChange(next);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  async function onSubmit(values: RuleFormValues): Promise<void> {
    const payload = {
      variantId: Number(values.variantId),
      warehouseId: Number(values.warehouseId),
      minQty: Number(values.minQty),
      maxQty: Number(values.maxQty),
      reorderQty: Number(values.reorderQty),
      safetyStock: values.safetyStock ? Number(values.safetyStock) : undefined,
      leadTimeDays: values.leadTimeDays ? Number(values.leadTimeDays) : undefined,
      vendorId: values.vendorId && values.vendorId !== SENTINEL ? Number(values.vendorId) : undefined,
    };

    const handleError = (err: unknown): void => {
      if (isApiError(err) && err.status === 409) {
        toast.error("A rule already exists for this product/warehouse combination");
      } else {
        toast.error(getErrorMessage(err) || (editRule ? "Failed to update rule" : "Failed to create rule"));
      }
    };

    if (editRule) {
      update.mutate(
        { ruleId: editRule.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Rule updated");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Replenishment rule created");
          onOpenChange(false);
        },
        onError: handleError,
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={editRule ? "Edit Rule" : "Add Replenishment Rule"}
      description="Set min/max stock levels and reorder parameters."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            onClick={form.handleSubmit(onSubmit)}
            isPending={isPending}
            loadingText="Saving…"
          >
            {editRule ? "Save Changes" : "Create Rule"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <div className="space-y-4 px-6 py-4">
          <FormField
            control={form.control}
            name="variantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Variant</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!!editRule}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.productName} — {v.sku}
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
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warehouse</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!!editRule}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="minQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Qty</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Qty</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reorderQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Qty</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="safetyStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Safety Stock</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Vendor</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor (optional)..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SENTINEL}>None</SelectItem>
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
        </div>
      </Form>
    </AppSheet>
  );
}
