"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy-units";
import { useOrgLocations } from "@/hooks/api/org-hierarchy";
import {
  CLASSIFICATION_OPTIONS,
  type AudienceMode,
  type ClassificationFormValues,
  type ClassificationOption,
} from "./document-classification-model";

interface ClassificationFieldsProps {
  /** Moving into Internal or Restricted needs the permission to publish documents. */
  canPublish: boolean;
  /** Something other than the classification itself stops this document being shared (its type, its owner, ...). */
  sharingBlocked: boolean;
}

interface ClassificationRadioProps {
  option: ClassificationOption;
  disabledReason: string | null;
}

function ClassificationRadio({ option, disabledReason }: ClassificationRadioProps) {
  return (
    <FormItem className="flex items-start gap-3 rounded-md border border-border p-3">
      <FormControl>
        <RadioGroupItem value={option.value} disabled={disabledReason !== null} className="mt-0.5" />
      </FormControl>
      <div className="flex flex-col gap-0.5">
        <FormLabel className="font-medium">{option.label}</FormLabel>
        <FormDescription>{disabledReason ?? option.description}</FormDescription>
      </div>
    </FormItem>
  );
}

interface UnitCheckboxProps {
  unitId: string;
  name: string;
  checked: boolean;
  onToggle: (unitId: string, checked: boolean) => void;
}

function UnitCheckbox({ unitId, name, checked, onToggle }: UnitCheckboxProps) {
  const handleCheckedChange = useCallback(
    (next: boolean | "indeterminate") => onToggle(unitId, next === true),
    [onToggle, unitId],
  );
  return (
    <FormItem className="flex items-center gap-2">
      <FormControl>
        <Checkbox checked={checked} onCheckedChange={handleCheckedChange} />
      </FormControl>
      <FormLabel className="font-normal">{name}</FormLabel>
    </FormItem>
  );
}

interface UnitListProps {
  field: "departmentIds" | "locationIds";
  label: string;
  units: ReadonlyArray<{ id: string; name: string }>;
  emptyHint: string;
}

function UnitList({ field, label, units, emptyHint }: UnitListProps) {
  const form = useFormContext<ClassificationFormValues>();
  const selected = form.watch(field);

  const handleToggle = useCallback(
    (unitId: string, checked: boolean) => {
      const current = form.getValues(field);
      const next = checked ? [...new Set([...current, unitId])] : current.filter((id) => id !== unitId);
      form.setValue(field, next, { shouldDirty: true, shouldValidate: true });
    },
    [field, form],
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {units.map((unit) => (
            <FormField
              key={unit.id}
              control={form.control}
              name={field}
              render={() => (
                <UnitCheckbox unitId={unit.id} name={unit.name} checked={selected.includes(unit.id)} onToggle={handleToggle} />
              )}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

function AudienceUnitPicker() {
  const departments = useOrgDepartments({ limit: 100 });
  const locations = useOrgLocations({ limit: 100 });
  const hint = departments.isPending && locations.isPending
    ? "Loading…"
    : "None to choose from. Departments and locations come from organisation settings.";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-3">
      <UnitList field="departmentIds" label="Departments" units={departments.data?.data ?? []} emptyHint={hint} />
      <UnitList field="locationIds" label="Locations" units={locations.data?.data ?? []} emptyHint={hint} />
    </div>
  );
}

const AUDIENCE_CHOICES: ReadonlyArray<{ value: AudienceMode; label: string; description: string }> = [
  { value: "HR_ONLY", label: "HR only", description: "Nobody outside HR sees it in the Knowledge Base yet." },
  { value: "ALL_EMPLOYEES", label: "All employees", description: "Every current employee." },
  { value: "SELECTED", label: "Selected departments or locations", description: "Only people in the units you tick." },
];

export function DocumentClassificationFormFields({ canPublish, sharingBlocked }: ClassificationFieldsProps) {
  const form = useFormContext<ClassificationFormValues>();
  const classification = form.watch("classification");
  const audienceMode = form.watch("audienceMode");
  const shareable = CLASSIFICATION_OPTIONS.some((option) => option.value === classification && option.shareable);

  const handleEffectiveDateChange = useCallback(
    (value: string) => form.setValue("effectiveDate", value, { shouldDirty: true }),
    [form],
  );

  function reasonFor(option: ClassificationOption): string | null {
    if (!option.shareable) return null;
    if (sharingBlocked) return "This document cannot be shared. See the reasons above.";
    if (!canPublish) return "Needs the permission to publish documents.";
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <FormField
        control={form.control}
        name="classification"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel>Classification</FormLabel>
            <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
              {CLASSIFICATION_OPTIONS.map((option) => (
                <FormField
                  key={option.value}
                  control={form.control}
                  name="classification"
                  render={() => <ClassificationRadio option={option} disabledReason={reasonFor(option)} />}
                />
              ))}
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="effectiveDate"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-2">
            <FormLabel>Effective from</FormLabel>
            <FormControl>
              <DatePicker value={field.value} onChange={handleEffectiveDateChange} placeholder="No date" />
            </FormControl>
            <FormDescription>When this version of the document takes effect. Optional.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {shareable ? (
        <FormField
          control={form.control}
          name="audienceMode"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel>Who can see it in the Knowledge Base</FormLabel>
              <RadioGroup value={field.value} onValueChange={field.onChange} disabled={!canPublish} className="gap-2">
                {AUDIENCE_CHOICES.map((choice) => (
                  <FormItem key={choice.value} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <FormControl>
                      <RadioGroupItem value={choice.value} className="mt-0.5" />
                    </FormControl>
                    <div className="flex flex-col gap-0.5">
                      <FormLabel className="font-medium">{choice.label}</FormLabel>
                      <FormDescription>{choice.description}</FormDescription>
                    </div>
                  </FormItem>
                ))}
              </RadioGroup>
              <FormDescription>
                {canPublish
                  ? "This is the most anyone can be shown. An entry in the Knowledge Base can show it to fewer people, never more."
                  : "Changing who can see it needs the permission to publish documents."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {shareable && audienceMode === "SELECTED" ? <AudienceUnitPicker /> : null}
    </div>
  );
}
