"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ManagerCandidatePicker, describeManager } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { PolicyMissingBanner } from "@/components/hr/reporting-lines/policy-missing-banner";
import { useReportingManagerPolicy } from "@/hooks/api/hr/reporting-manager-policy";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import type { onboardEmployeeInputSchema } from "@/lib/validation/hr";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const REPORTING_FIELDS = ["reportingManagerUserId", "topLevelRole", "topLevelRoleReason", "secondaryManagers"] as const;

interface StepEmploymentReportingProps {
  form: UseFormReturn<FormValues>;
}

interface SecondaryManagerRowProps {
  form: UseFormReturn<FormValues>;
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

function SecondaryManagerRow({ form, index, disabled, onRemove }: SecondaryManagerRowProps) {
  const entry = form.watch(`secondaryManagers.${index}`);
  const primaryId = form.watch("reportingManagerUserId");

  function handleManagerChange(userId: string | null, manager: ManagerRef | null) {
    form.setValue(`secondaryManagers.${index}.managerUserId`, userId ?? "", { shouldDirty: true });
    form.setValue(`secondaryManagers.${index}.managerRef`, manager, { shouldDirty: true });
    void form.trigger("secondaryManagers");
  }

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-start">
      <FormField
        control={form.control}
        name={`secondaryManagers.${index}.managerUserId`}
        render={() => (
          <FormItem>
            <FormLabel>Additional manager {index + 1}</FormLabel>
            <FormControl>
              <ManagerCandidatePicker
                value={entry?.managerUserId || null}
                onChange={handleManagerChange}
                selected={entry?.managerRef ?? null}
                excludeUserIds={primaryId ? [primaryId] : []}
                disabled={disabled}
                placeholder="Search for a manager"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`secondaryManagers.${index}.label`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Relationship (optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Functional, Project" {...field} value={field.value ?? ""} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:mt-6"
        onClick={handleRemove}
        disabled={disabled}
        aria-label={`Remove additional manager ${index + 1}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * The reporting half of the Job Details step (PRD §7.2): an optional primary
 * manager assigned by policy when blank, additional managers up to the org's cap,
 * and a top-level role that disables and clears every manager field.
 */
export function StepEmploymentReporting({ form }: StepEmploymentReportingProps) {
  const { data: policy } = useReportingManagerPolicy();
  const cap = policy?.maxSecondaryManagersPerEmployee ?? 0;
  const topLevelRole = form.watch("topLevelRole") === true;
  const primaryRef = form.watch("reportingManagerRef") ?? null;
  const primaryId = form.watch("reportingManagerUserId");
  const secondaries = useFieldArray({ control: form.control, name: "secondaryManagers" });
  const secondaryIds = (form.watch("secondaryManagers") ?? []).map((entry) => entry.managerUserId).filter(Boolean);

  function handleTopLevelRoleChange(checked: boolean | "indeterminate") {
    const isTopLevel = checked === true;
    form.setValue("topLevelRole", isTopLevel, { shouldDirty: true });
    if (isTopLevel) {
      form.setValue("reportingManagerUserId", undefined, { shouldDirty: true });
      form.setValue("reportingManagerRef", null, { shouldDirty: true });
      secondaries.replace([]);
    } else form.setValue("topLevelRoleReason", undefined, { shouldDirty: true });
    void form.trigger([...REPORTING_FIELDS]);
  }

  function handlePrimaryChange(userId: string | null, manager: ManagerRef | null) {
    form.setValue("reportingManagerUserId", userId ?? undefined, { shouldDirty: true });
    form.setValue("reportingManagerRef", manager, { shouldDirty: true });
    void form.trigger(["reportingManagerUserId", "secondaryManagers"]);
  }

  function handleAddSecondary() {
    secondaries.append({ managerUserId: "", label: "", managerRef: null });
  }

  function handleRemoveSecondary(index: number) {
    secondaries.remove(index);
  }

  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <PolicyMissingBanner context="form" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="reportingManagerUserId"
          render={() => (
            <FormItem>
              <FormLabel>Primary reporting manager</FormLabel>
              <FormControl>
                <ManagerCandidatePicker
                  value={primaryId ?? null}
                  onChange={handlePrimaryChange}
                  selected={primaryRef}
                  excludeUserIds={secondaryIds}
                  placeholder="Search for a manager"
                  disabled={topLevelRole}
                  allowUnassigned
                />
              </FormControl>
              <FormDescription className="text-xs">
                {topLevelRole
                  ? "Not used for a top-level role: this person reports to nobody."
                  : primaryRef && primaryRef.userId === primaryId
                    ? `${primaryRef.name}${describeManager(primaryRef) ? ` · ${describeManager(primaryRef)}` : ""}. Approves this employee's leave, time and expenses.`
                    : "Assigned automatically by policy if left blank."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="topLevelRole"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 sm:pt-7">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={handleTopLevelRoleChange} />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-normal">Top-level role — no reporting manager</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          {topLevelRole ? (
            <FormField
              control={form.control}
              name="topLevelRoleReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Founder and chief executive" aria-required="true" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
      </div>
      {cap > 0 && !topLevelRole ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Additional reporting managers</legend>
          <p className="text-xs text-muted-foreground">
            Dotted-line contacts shown on the profile. They never approve requests. Up to {cap}.
          </p>
          {secondaries.fields.map((row, index) => (
            <SecondaryManagerRow key={row.id} form={form} index={index} disabled={topLevelRole} onRemove={handleRemoveSecondary} />
          ))}
          {secondaries.fields.length < cap ? (
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1" onClick={handleAddSecondary}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add additional manager
            </Button>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
