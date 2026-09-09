"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateInspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import type { InspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import {
  inspectionPlanEditSchema,
  type InspectionPlanEditValues,
} from "./inspection-plan-schema";

interface InspectionPlanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: InspectionPlan;
}

/**
 * The four things about a live plan that may change, and the switch that takes
 * it out of service without destroying the evidence it produced.
 *
 * Pausing rather than retiring is the ordinary correction: a paused plan stops
 * quarantining arrivals while the inspections it already governed keep naming a
 * plan that still exists.
 */
export function InspectionPlanEditDialog({
  open,
  onOpenChange,
  plan,
}: InspectionPlanEditDialogProps) {
  const updatePlan = useUpdateInspectionPlan();

  function handleSubmit(values: InspectionPlanEditValues): void {
    const description = values.description?.trim() ?? "";
    updatePlan.mutate(
      {
        planId: plan.id,
        payload: {
          name: values.name.trim(),
          description: description === "" ? null : description,
          appliesOnReceipt: values.appliesOnReceipt,
          appliesOnReturn: values.appliesOnReturn,
          isActive: values.isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success("Inspection plan updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<InspectionPlanEditValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit inspection plan"
      description={`${plan.code} · the sampling rule changes by publishing a new version.`}
      resolver={zodResolver(inspectionPlanEditSchema)}
      defaultValues={{
        name: plan.name,
        description: plan.description ?? "",
        appliesOnReceipt: plan.appliesOnReceipt,
        appliesOnReturn: plan.appliesOnReturn,
        isActive: plan.isActive,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updatePlan.isPending}
      submitLabel="Save changes"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Electronics intake check" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="What this plan is for" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="appliesOnReceipt"
              render={({ field }) => (
                <FormItem className="rounded-md border border-border/70 px-3 py-2">
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <FormLabel>On receipt</FormLabel>
                      <FormDescription>Goods receipts are held until inspected.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appliesOnReturn"
              render={({ field }) => (
                <FormItem className="rounded-md border border-border/70 px-3 py-2">
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <FormLabel>On return</FormLabel>
                      <FormDescription>Returned goods are inspected before restock.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="rounded-md border border-border/70 px-3 py-2">
                <div className="flex flex-row items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      A paused plan stops quarantining arrivals; its history stays.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
