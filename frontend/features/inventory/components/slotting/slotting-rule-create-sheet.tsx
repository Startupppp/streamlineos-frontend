"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSlottingRule } from "@/hooks/api/inventory/slotting-labor";
import { SlottingRuleFormFields } from "./slotting-rule-form-fields";
import {
  SLOTTING_RULE_FORM_DEFAULTS,
  slottingRuleFormSchema,
  toCreateSlottingRulePayload,
  type SlottingRuleFormValues,
} from "./slotting-rule-schema";

interface SlottingRuleCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Rung 4 of the overlay ladder, and the count is what decides it: seven fields
 * — warehouse, name, match type, the match payload, target, narrowing, priority
 * — in three sections a planner reads as three questions (which building, what
 * this catches, where it sends it). §13 puts 6+/multi-section on the Sheet, and
 * the target select is only meaningful next to the warehouse select that scopes
 * it, so keeping both on screen together is the point rather than an accident.
 */
export function SlottingRuleCreateSheet({ open, onOpenChange }: SlottingRuleCreateSheetProps) {
  const createRule = useCreateSlottingRule();

  function handleSubmit(values: SlottingRuleFormValues): void {
    createRule.mutate(toCreateSlottingRulePayload(values), {
      onSuccess: () => {
        toast.success("Slotting rule created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<SlottingRuleFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New slotting rule"
      description="Where a class of SKU belongs, so putaway stops ranking bins by remaining room alone."
      resolver={zodResolver(slottingRuleFormSchema)}
      defaultValues={SLOTTING_RULE_FORM_DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={createRule.isPending}
      submitLabel="Create rule"
      side="right"
      className="sm:max-w-lg"
      resetOnOpen
    >
      {(form) => <SlottingRuleFormFields form={form} />}
    </EntityFormSheet>
  );
}
