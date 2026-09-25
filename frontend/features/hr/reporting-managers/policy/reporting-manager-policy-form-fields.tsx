"use client";

import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ManagerCandidatePicker, describeManager } from "@/components/hr/reporting-lines/manager-candidate-picker";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import {
  FALLBACK_ORDER_OPTIONS,
  type ReportingManagerPolicyFormValues,
} from "./reporting-manager-policy-schema";

const SECONDARY_CAP_OPTIONS = ["0", "1", "2", "3"] as const;

interface ReportingManagerPolicyFormFieldsProps {
  form: UseFormReturn<ReportingManagerPolicyFormValues>;
  defaultManager: ManagerRef | null;
  readOnly: boolean;
}

export function ReportingManagerPolicyFormFields({ form, defaultManager, readOnly }: ReportingManagerPolicyFormFieldsProps) {
  function handleDefaultManagerChange(userId: string | null) {
    form.setValue("defaultPrimaryManagerUserId", userId, { shouldDirty: true, shouldValidate: true });
  }

  function handleFallbackOrderChange(value: string) {
    const match = FALLBACK_ORDER_OPTIONS.find((option) => option.value === value);
    if (match) form.setValue("fallbackOrder", match.value, { shouldDirty: true });
  }

  function handleCapChange(value: string) {
    form.setValue("maxSecondaryManagersPerEmployee", Number(value), { shouldDirty: true });
  }

  function handleThresholdChange(event: ChangeEvent<HTMLInputElement>) {
    form.setValue("requireReasonAfterChanges", event.target.valueAsNumber, { shouldDirty: true, shouldValidate: true });
  }

  function handleTopLevelChange(checked: boolean) {
    form.setValue("allowTopLevelWithoutManager", checked, { shouldDirty: true });
  }

  const selectedId = form.watch("defaultPrimaryManagerUserId");

  return (
    <fieldset disabled={readOnly} className="grid gap-5 md:grid-cols-2">
      <FormField
        control={form.control}
        name="defaultPrimaryManagerUserId"
        render={() => (
          <FormItem className="md:col-span-2">
            <FormLabel>Default reporting manager</FormLabel>
            <FormControl>
              <ManagerCandidatePicker
                value={selectedId}
                onChange={handleDefaultManagerChange}
                selected={defaultManager?.userId === selectedId ? defaultManager : null}
                placeholder="Choose the default reporting manager"
                allowUnassigned
                disabled={readOnly}
              />
            </FormControl>
            <FormDescription>
              {defaultManager && defaultManager.userId === selectedId
                ? `${defaultManager.name}${describeManager(defaultManager) ? ` · ${describeManager(defaultManager)}` : ""}. `
                : ""}
              Assigned when onboarding or an import leaves the manager blank. Saving does not change anyone&apos;s current manager.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="fallbackOrder"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>When the manager is left blank</FormLabel>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={handleFallbackOrderChange} className="gap-3">
                {FALLBACK_ORDER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-dense text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormDescription>
              If neither can be assigned, that employee or row is refused — the system never picks an administrator at random.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="maxSecondaryManagersPerEmployee"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional reporting managers per employee</FormLabel>
            <Select value={String(field.value)} onValueChange={handleCapChange} disabled={readOnly}>
              <FormControl>
                <SelectTrigger aria-label="Additional reporting managers per employee">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SECONDARY_CAP_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "0" ? "None" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Dotted-line managers are informational. They never approve leave, time or expenses. This does not limit how many people a manager can have.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="requireReasonAfterChanges"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Changes allowed in 24 hours before a reason is required</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={Number.isNaN(field.value) ? "" : field.value}
                onChange={handleThresholdChange}
                className="tabular-nums"
              />
            </FormControl>
            <FormDescription>
              The next primary-manager change for the same employee shows a warning and needs a reason and an HR or org admin.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="allowTopLevelWithoutManager"
        render={({ field }) => (
          <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border p-3 md:col-span-2">
            <div className="flex flex-col gap-0.5">
              <FormLabel>Allow top-level roles without a manager</FormLabel>
              <FormDescription>A top-level role always needs a written reason and cannot have any manager.</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={handleTopLevelChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </fieldset>
  );
}
