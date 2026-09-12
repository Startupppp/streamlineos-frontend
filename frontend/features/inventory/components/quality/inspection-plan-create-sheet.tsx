"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateInspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import type { CreateInspectionPlanPayload } from "@/hooks/api/inventory/inspection-plans";
import { InspectionPlanFormFields } from "./inspection-plan-form-fields";
import {
  inspectionPlanFormSchema,
  type InspectionPlanFormValues,
} from "./inspection-plan-schema";

interface InspectionPlanCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: InspectionPlanFormValues = {
  code: "",
  name: "",
  description: "",
  scope: "ALL",
  categoryId: "",
  productVariantId: "",
  appliesOnReceipt: true,
  appliesOnReturn: false,
  samplingMethod: "ALL",
  sampleValue: "",
  instructions: "",
};

/**
 * The plan and its first version are created together: a plan with no published
 * version answers no receipt, so leaving the rule as a second step would make an
 * inert plan the easiest thing to produce.
 */
export function InspectionPlanCreateSheet({ open, onOpenChange }: InspectionPlanCreateSheetProps) {
  const createPlan = useCreateInspectionPlan();

  function handleSubmit(values: InspectionPlanFormValues): void {
    createPlan.mutate(toPayload(values), {
      onSuccess: () => {
        toast.success("Inspection plan created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<InspectionPlanFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New inspection plan"
      description="Decide which arrivals are held for inspection before they become available."
      resolver={zodResolver(inspectionPlanFormSchema)}
      defaultValues={DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={createPlan.isPending}
      submitLabel="Create plan"
      side="right"
      className="sm:max-w-lg"
      resetOnOpen
    >
      {(form) => <InspectionPlanFormFields form={form} />}
    </EntityFormSheet>
  );
}

function toPayload(values: InspectionPlanFormValues): CreateInspectionPlanPayload {
  const scoped =
    values.scope === "CATEGORY"
      ? { categoryId: Number(values.categoryId) }
      : values.scope === "PRODUCT_VARIANT"
        ? { productVariantId: Number(values.productVariantId) }
        : {};
  return {
    code: values.code,
    name: values.name,
    ...(values.description ? { description: values.description } : {}),
    ...scoped,
    appliesOnReceipt: values.appliesOnReceipt,
    appliesOnReturn: values.appliesOnReturn,
    samplingMethod: values.samplingMethod,
    ...(values.samplingMethod === "ALL" ? {} : { sampleValue: values.sampleValue?.trim() }),
    ...(values.instructions ? { instructions: values.instructions } : {}),
  };
}
