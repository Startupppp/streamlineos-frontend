"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useRectifyMyProfile } from "@/hooks/api/privacy/gdpr";
import { getErrorMessage } from "@/lib/get-error-message";
import { RECTIFIABLE_FIELDS, rectificationSchema, type RectificationValues } from "./rectification-schema";

const DEFAULT_VALUES: RectificationValues = { field: "profile.name", value: "" };

interface RectificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** GDPR Art. 16 — the subject corrects their own record; the change is applied and logged. */
export function RectificationDialog({ open, onOpenChange }: RectificationDialogProps) {
  const rectify = useRectifyMyProfile();

  function handleSubmit(values: RectificationValues) {
    rectify.mutate(values, {
      onSuccess: (result) => {
        toast.success(result.changed ? "Corrected your record" : "Your record already held that value");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormDialog<RectificationValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Correct your personal data"
      description="The correction is applied to your record straight away and kept in the data-request log."
      resolver={zodResolver(rectificationSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={rectify.isPending}
      submitLabel="Save correction"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="field"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What needs correcting?</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {RECTIFIABLE_FIELDS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correct value</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  For your address or emergency contact, ask HR to update your employee profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
