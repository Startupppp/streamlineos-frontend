"use client";

import { type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FieldFormValues } from "../lib/custom-field-form";

interface FieldTypeSectionsProps {
  form: UseFormReturn<FieldFormValues>;
  watchedFieldType: string;
}

export function FieldTypeSections({ form, watchedFieldType }: FieldTypeSectionsProps) {
  const showPlaceholder =
    watchedFieldType === "text" ||
    watchedFieldType === "number" ||
    watchedFieldType === "currency" ||
    watchedFieldType === "date";

  const needsTextValidation = watchedFieldType === "text";
  const needsNumericValidation =
    watchedFieldType === "number" || watchedFieldType === "currency";
  const needsDateValidation = watchedFieldType === "date";
  const needsValidation = needsTextValidation || needsNumericValidation || needsDateValidation;

  return (
    <>
      {showPlaceholder && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Placeholder</Label>
          <Input
            {...form.register("placeholder")}
            className="text-sm"
            placeholder="Shown when the field is empty"
          />
        </div>
      )}

      {needsValidation && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Validation Rules</Label>
          <div className="grid grid-cols-2 gap-2">
            {needsTextValidation && (
              <>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Min Length</Label>
                  <Input
                    type="number"
                    {...form.register("validationMinLength")}
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Max Length</Label>
                  <Input
                    type="number"
                    {...form.register("validationMaxLength")}
                    placeholder="500"
                    min={1}
                  />
                </div>
              </>
            )}
            {needsNumericValidation && (
              <>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Min Value</Label>
                  <Input
                    type="number"
                    {...form.register("validationMinValue")}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Max Value</Label>
                  <Input
                    type="number"
                    {...form.register("validationMaxValue")}
                  />
                </div>
              </>
            )}
            {needsDateValidation && (
              <>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Date From</Label>
                  <Input
                    type="date"
                    {...form.register("validationDateMin")}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-dense text-muted-foreground">Date To</Label>
                  <Input
                    type="date"
                    {...form.register("validationDateMax")}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
