"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/shared";
import {
  PRODUCT_TYPE_OPTIONS,
  type CreateManagedProductFormValues,
} from "./managed-product-schema";
import { upperCaseFieldChange } from "@/lib/case-field";

interface ManagedProductCreateFieldsProps {
  form: UseFormReturn<CreateManagedProductFormValues>;
  formId: string;
  onSubmit: (v: CreateManagedProductFormValues) => void;
}

export function ManagedProductCreateFields({ form, formId, onSubmit }: ManagedProductCreateFieldsProps) {
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
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product type (optional)</FormLabel>
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template type…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
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
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="PROD"
                  onChange={upperCaseFieldChange(field.onChange)}
                />
              </FormControl>
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
      </form>
    </Form>
  );
}
