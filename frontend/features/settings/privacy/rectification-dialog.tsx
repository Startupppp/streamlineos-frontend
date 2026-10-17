"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useRectifyMyProfile } from "@/hooks/api/privacy/gdpr";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  EMPTY_ADDRESS,
  EMPTY_EMERGENCY_CONTACT,
  RECTIFIABLE_FIELDS,
  rectificationSchema,
  toRectificationBody,
  type RectificationFormInput,
  type RectificationValues,
} from "./rectification-schema";

const DEFAULT_VALUES: RectificationFormInput = {
  field: "profile.name",
  value: "",
  address: EMPTY_ADDRESS,
  emergencyContact: EMPTY_EMERGENCY_CONTACT,
};

type PartName =
  | `address.${keyof typeof EMPTY_ADDRESS}`
  | `emergencyContact.${keyof typeof EMPTY_EMERGENCY_CONTACT}`;

const ADDRESS_PARTS: ReadonlyArray<{ name: PartName; label: string; autoComplete: string }> = [
  { name: "address.line1", label: "Address line 1", autoComplete: "address-line1" },
  { name: "address.line2", label: "Address line 2", autoComplete: "address-line2" },
  { name: "address.city", label: "City", autoComplete: "address-level2" },
  { name: "address.state", label: "State or region", autoComplete: "address-level1" },
  { name: "address.postalCode", label: "Postal code", autoComplete: "postal-code" },
  { name: "address.country", label: "Country", autoComplete: "country-name" },
];

const CONTACT_PARTS: ReadonlyArray<{ name: PartName; label: string; autoComplete: string }> = [
  { name: "emergencyContact.name", label: "Contact name", autoComplete: "off" },
  { name: "emergencyContact.relationship", label: "Relationship", autoComplete: "off" },
  { name: "emergencyContact.phone", label: "Contact phone", autoComplete: "off" },
  { name: "emergencyContact.email", label: "Contact email", autoComplete: "off" },
];

interface RectificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** GDPR Art. 16 — the subject corrects their own record; the change is applied and logged. */
export function RectificationDialog({ open, onOpenChange }: RectificationDialogProps) {
  const rectify = useRectifyMyProfile();

  function handleSubmit(values: RectificationValues) {
    rectify.mutate(toRectificationBody(values), {
      onSuccess: (result) => {
        toast.success(result.changed ? "Corrected your record" : "Your record already held that value");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormDialog<RectificationFormInput, RectificationValues>
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
      {(form) => {
        const selected = form.watch("field");
        const parts = selected === "hr_profile.address" ? ADDRESS_PARTS : selected === "hr_profile.emergency_contact" ? CONTACT_PARTS : null;
        return (
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
          {parts ? (
            <>
              {parts.map((part) => (
                <FormField
                  key={part.name}
                  control={form.control}
                  name={part.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{part.label}</FormLabel>
                      <FormControl>
                        <Input autoComplete={part.autoComplete} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <p className="text-xs text-muted-foreground">
                What you enter replaces the whole {selected === "hr_profile.address" ? "address" : "emergency contact"} on file; leave a line empty to clear it.
              </p>
            </>
          ) : (
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct value</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
        );
      }}
    </EntityFormDialog>
  );
}
