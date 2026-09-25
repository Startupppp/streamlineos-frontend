"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import type { ReportingLineEditorValues } from "./reporting-line-editor-schema";

interface ReportingLineEditorFieldsProps {
  form: UseFormReturn<ReportingLineEditorValues>;
  employeeUserId: string;
  maxSecondaryManagers: number;
  canOverride: boolean;
}

interface SecondaryRowProps extends Pick<ReportingLineEditorFieldsProps, "form" | "employeeUserId"> {
  index: number;
  onRemove: (index: number) => void;
}

function SecondaryRow({ form, employeeUserId, index, onRemove }: SecondaryRowProps) {
  const entry = form.watch(`secondaryManagers.${index}`);
  const primaryId = form.watch("primaryManagerUserId");

  function handleChange(userId: string | null, manager: ManagerRef | null) {
    form.setValue(`secondaryManagers.${index}.managerUserId`, userId ?? "", { shouldDirty: true });
    form.setValue(`secondaryManagers.${index}.managerRef`, manager, { shouldDirty: true });
    void form.trigger("secondaryManagers");
  }

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border p-3">
      <FormField
        control={form.control}
        name={`secondaryManagers.${index}.managerUserId`}
        render={() => (
          <FormItem>
            <FormLabel>Additional manager {index + 1}</FormLabel>
            <FormControl>
              <ManagerCandidatePicker
                value={entry?.managerUserId || null}
                onChange={handleChange}
                selected={entry?.managerRef ?? null}
                excludeUserId={employeeUserId}
                excludeUserIds={primaryId ? [primaryId] : []}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex items-end gap-2">
        <FormField
          control={form.control}
          name={`secondaryManagers.${index}.label`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Relationship (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Functional, Project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} aria-label={`Remove additional manager ${index + 1}`}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function ReportingLineEditorFields({ form, employeeUserId, maxSecondaryManagers, canOverride }: ReportingLineEditorFieldsProps) {
  const secondaries = useFieldArray({ control: form.control, name: "secondaryManagers" });
  const topLevel = form.watch("topLevel");
  const primaryId = form.watch("primaryManagerUserId");
  const primaryRef = form.watch("primaryManagerRef");
  const reasonRequired = form.watch("reasonRequired") || form.watch("emergency");
  const secondaryIds = form.watch("secondaryManagers").map((entry) => entry.managerUserId).filter(Boolean);

  function handlePrimaryChange(userId: string | null, manager: ManagerRef | null) {
    form.setValue("primaryManagerUserId", userId, { shouldDirty: true });
    form.setValue("primaryManagerRef", manager, { shouldDirty: true });
    void form.trigger(["primaryManagerUserId", "secondaryManagers"]);
  }

  function handleTopLevelChange(checked: boolean | "indeterminate") {
    const isTopLevel = checked === true;
    form.setValue("topLevel", isTopLevel, { shouldDirty: true });
    if (isTopLevel) {
      form.setValue("primaryManagerUserId", null, { shouldDirty: true });
      form.setValue("primaryManagerRef", null, { shouldDirty: true });
      secondaries.replace([]);
    }
  }

  function handleEmergencyChange(checked: boolean | "indeterminate") {
    form.setValue("emergency", checked === true, { shouldDirty: true });
  }

  function handleAddSecondary() {
    secondaries.append({ managerUserId: "", label: "", managerRef: null });
  }

  function handleRemoveSecondary(index: number) {
    secondaries.remove(index);
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="primaryManagerUserId"
        render={() => (
          <FormItem>
            <FormLabel>Primary reporting manager</FormLabel>
            <FormControl>
              <ManagerCandidatePicker
                value={primaryId}
                onChange={handlePrimaryChange}
                selected={primaryRef}
                excludeUserId={employeeUserId}
                excludeUserIds={secondaryIds}
                disabled={topLevel}
              />
            </FormControl>
            <FormDescription>
              {topLevel
                ? "Not used for a top-level role: this person reports to nobody."
                : "Approves leave, time and expenses from the effective date. Requests already waiting keep their approver."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="topLevel"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={handleTopLevelChange} />
            </FormControl>
            <FormLabel className="cursor-pointer text-sm font-normal">Top-level role — no reporting manager</FormLabel>
          </FormItem>
        )}
      />
      {topLevel ? (
        <FormField
          control={form.control}
          name="topLevelReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g. Founder and chief executive" aria-required="true" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {maxSecondaryManagers > 0 && !topLevel ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Additional reporting managers</legend>
          <p className="text-xs text-muted-foreground">Dotted-line contacts. They never approve requests. Up to {maxSecondaryManagers}.</p>
          <FormField control={form.control} name="secondaryManagers" render={() => <FormMessage />} />
          {secondaries.fields.map((row, index) => (
            <SecondaryRow key={row.id} form={form} employeeUserId={employeeUserId} index={index} onRemove={handleRemoveSecondary} />
          ))}
          {secondaries.fields.length < maxSecondaryManagers ? (
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1" onClick={handleAddSecondary}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add additional manager
            </Button>
          ) : null}
        </fieldset>
      ) : null}
      <FormField
        control={form.control}
        name="effectiveFrom"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Effective from (optional)</FormLabel>
            <FormControl>
              <Input type="date" {...field} className="w-full sm:w-48" />
            </FormControl>
            <FormDescription>Leave blank for today in your organisation&apos;s time zone. A future date schedules the change.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Reason {reasonRequired ? <span className="text-destructive">*</span> : "(optional)"}
            </FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Why the reporting line is changing" aria-required={reasonRequired} {...field} />
            </FormControl>
            <FormDescription>Recorded in the audit trail. Visible to HR, not to the employee or managers.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {canOverride ? (
        <FormField
          control={form.control}
          name="emergency"
          render={({ field }) => (
            <FormItem className="flex items-start gap-2 space-y-0 rounded-lg border border-border p-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={handleEmergencyChange} />
              </FormControl>
              <div className="flex flex-col gap-0.5">
                <FormLabel className="cursor-pointer text-sm font-medium">Emergency change</FormLabel>
                <FormDescription>Bypasses the repeated-change limit. Needs a reason and is logged as a high-severity event.</FormDescription>
              </div>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
