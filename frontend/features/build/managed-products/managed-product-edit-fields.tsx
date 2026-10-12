"use client";

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/shared";
import type { EditManagedProductFormValues } from "./managed-product-schema";
import { LIFECYCLE_OPTIONS, HEALTH_OPTIONS, ROADMAP_HORIZON_OPTIONS } from "./managed-product-schema";
import { ChipInput } from "@/features/recruitment/jobs/create-job-form/chip-input";

interface ManagedProductEditFieldsProps {
  form: UseFormReturn<EditManagedProductFormValues>;
  formId: string;
  onSubmit: (v: EditManagedProductFormValues) => void;
}

export function ManagedProductEditFields({
  form,
  formId,
  onSubmit,
}: ManagedProductEditFieldsProps) {
  const handleSegmentsChange = useCallback(
    (value: string[]) => form.setValue("segments", value, { shouldDirty: true }),
    [form],
  );
  const handleTagsChange = useCallback(
    (value: string[]) => form.setValue("tags", value, { shouldDirty: true }),
    [form],
  );

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Product name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
          name="roadmapDefaultHorizon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default roadmap horizon (optional)</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default horizon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROADMAP_HORIZON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
          name="northStarMetric"
          render={({ field }) => (
            <FormItem>
              <FormLabel>North-star metric (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g. Monthly active users"
                />
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
        <FormField
          control={form.control}
          name="vision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vision (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={3}
                  placeholder="Long-term vision for this product…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="missionStatement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mission (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={3}
                  placeholder="Mission statement…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetCustomer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target audience (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={2}
                  placeholder="Who is this product for…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="differentiators"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Differentiators (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={2}
                  placeholder="What makes this product unique…"
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
