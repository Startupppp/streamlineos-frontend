"use client";

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberPicker } from "@/components/shared";
import type { CreateManagedProductFormValues } from "./managed-product-schema";
import { LIFECYCLE_OPTIONS, HEALTH_OPTIONS } from "./managed-product-schema";
import { upperCaseFieldChange } from "@/lib/case-field";
import { ChipInput } from "@/features/recruitment/jobs/create-job-form/chip-input";

const DERIVED_KEY_LENGTH = 10;

function deriveProductKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, DERIVED_KEY_LENGTH);
}

interface ManagedProductCreateFieldsProps {
  form: UseFormReturn<CreateManagedProductFormValues>;
  formId: string;
  onSubmit: (v: CreateManagedProductFormValues) => void;
}

export function ManagedProductCreateFields({ form, formId, onSubmit }: ManagedProductCreateFieldsProps) {
  const handleSegmentsChange = useCallback(
    (value: string[]) => form.setValue("segments", value, { shouldDirty: true }),
    [form],
  );
  const handleTagsChange = useCallback(
    (value: string[]) => form.setValue("tags", value, { shouldDirty: true }),
    [form],
  );
  const handleNameChange = useCallback(
    (name: string) => {
      if (form.getFieldState("key").isDirty) return;
      form.setValue("key", deriveProductKey(name), { shouldValidate: form.formState.isSubmitted });
    },
    [form],
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Product name"
                  onChange={(e) => {
                    field.onChange(e);
                    handleNameChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="PROD"
                  onChange={upperCaseFieldChange(field.onChange)}
                />
              </FormControl>
              <FormDescription>
                Up to 50 characters: uppercase letters, digits, hyphens or underscores. Suggested from the name until you edit it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="Describe this product…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner (optional)</FormLabel>
              <FormControl>
                <MemberPicker
                  directory="build"
                  mode="single"
                  value={field.value || undefined}
                  onChange={(id) => field.onChange(id ?? "")}
                  allowUnassigned
                  placeholder="Select owner"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lifecycle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lifecycle (optional)</FormLabel>
              <Select value={field.value ?? ""} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lifecycle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LIFECYCLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="health"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health (optional)</FormLabel>
              <Select value={field.value ?? ""} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select health" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {HEALTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="northStarMetric"
          render={({ field }) => (
            <FormItem>
              <FormLabel>North-star metric (optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="e.g. Monthly active users" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="segments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Segments (optional)</FormLabel>
              <FormControl>
                <ChipInput
                  value={field.value}
                  onChange={handleSegmentsChange}
                  placeholder="Type and press Enter (max 20)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (optional)</FormLabel>
              <FormControl>
                <ChipInput
                  value={field.value}
                  onChange={handleTagsChange}
                  placeholder="Type and press Enter (max 20)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
