"use client";

import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CLASSIFICATION_OPTIONS,
  type AudienceMode,
  type ClassificationFormValues,
  type ClassificationOption,
} from "./document-classification-model";
import { AudienceUnitPicker } from "./document-audience-unit-picker";

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
  // The date picker can only pick a date, never remove one; "" is what the form maps to null for the server.
  const handleClearEffectiveDate = useCallback(
    () => form.setValue("effectiveDate", "", { shouldDirty: true }),
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
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Effective from</FormLabel>
              {field.value !== "" ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  aria-label="Clear effective date"
                  onClick={handleClearEffectiveDate}
                >
                  Clear
                </Button>
              ) : null}
            </div>
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
