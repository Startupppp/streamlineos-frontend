"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCommissionPlan,
  useCreateCommissionVersion,
  useUpdateCommissionVersion,
} from "@/hooks/api/crm/commission";
import type { CommissionPlanVersion } from "@/hooks/api/crm/commission-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { CommissionRulesFields } from "./commission-rules-fields";
import {
  DEFAULT_RULES,
  commissionPlanFormSchema,
  fromRuleSet,
  toRuleSet,
  type CommissionPlanFormValues,
} from "./commission-rules-schema";

export type CommissionPlanSheetTarget =
  | { kind: "plan"; currency: string }
  | { kind: "version"; planId: string; currency: string; version: CommissionPlanVersion | null };

interface CommissionPlanSheetProps {
  target: CommissionPlanSheetTarget | null;
  onOpenChange: (open: boolean) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * New plan, new version, or an edit to a version nothing has been earned
 * against yet. A plan's money only ever changes through a dated version, so
 * there is no "edit rules" on the plan itself.
 */
export function CommissionPlanSheet({ target, onOpenChange }: CommissionPlanSheetProps) {
  const createPlan = useCreateCommissionPlan();
  const createVersion = useCreateCommissionVersion();
  const updateVersion = useUpdateCommissionVersion();
  const currency = target?.currency ?? "INR";
  const editing = target?.kind === "version" ? target.version : null;

  const defaults = useMemo<CommissionPlanFormValues>(
    () => ({
      kind: target?.kind ?? "plan",
      name: "",
      description: "",
      currency,
      effectiveFrom: editing?.effectiveFrom ?? today(),
      note: editing?.note ?? "",
      rules: editing ? fromRuleSet(editing.rules, currency) : DEFAULT_RULES,
    }),
    [target?.kind, currency, editing],
  );

  const callbacks = (message: string) => ({
    onSuccess: () => {
      toast.success(message);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(getErrorMessage(error)),
  });

  const handleSubmit = (values: CommissionPlanFormValues) => {
    if (!target) return;
    const note = values.note !== "" ? { note: values.note } : {};
    if (target.kind === "plan") {
      createPlan.mutate(
        {
          name: values.name,
          ...(values.description !== "" ? { description: values.description } : {}),
          currency: values.currency,
          effectiveFrom: values.effectiveFrom,
          rules: toRuleSet(values.rules, values.currency),
          ...note,
        },
        callbacks("Plan created"),
      );
      return;
    }
    const version = {
      planId: target.planId,
      effectiveFrom: values.effectiveFrom,
      rules: toRuleSet(values.rules, currency),
      ...note,
    };
    if (target.version)
      updateVersion.mutate({ ...version, planVersionId: target.version.planVersionId }, callbacks("Version saved"));
    else createVersion.mutate(version, callbacks("Version added"));
  };

  const title =
    target?.kind === "plan" ? "New commission plan" : editing ? `Edit version ${editing.versionNumber}` : "New version";

  return (
    <EntityFormSheet<CommissionPlanFormValues>
      open={target !== null}
      onOpenChange={onOpenChange}
      title={title}
      description="Rates are percentages and amounts are in the plan's currency; a version applies from its date forward, never retroactively."
      resolver={zodResolver(commissionPlanFormSchema)}
      defaultValues={defaults}
      onSubmit={handleSubmit}
      isSubmitting={createPlan.isPending || createVersion.isPending || updateVersion.isPending}
      submitLabel={target?.kind === "plan" ? "Create plan" : "Save version"}
      resetOnOpen
    >
      {(form) => (
        <>
          {target?.kind === "plan" ? (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} rows={2} />
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
                      <Input {...field} maxLength={3} placeholder="INR" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Takes effect</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="Takes effect" />
                <FormMessage />
              </FormItem>
            )}
          />
          <CommissionRulesFields form={form} currency={form.watch("currency") || currency} />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="Why the rules are what they are" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
