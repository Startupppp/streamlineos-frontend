"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCategories } from "@/hooks/api/inventory/products";
import {
  PLAN_SCOPES,
  PLAN_SCOPE_LABEL,
  SAMPLING_METHODS,
  SAMPLING_METHOD_LABEL,
  type InspectionPlanFormValues,
} from "./inspection-plan-schema";

interface InspectionPlanFormFieldsProps {
  form: UseFormReturn<InspectionPlanFormValues>;
  /** The code is the plan's stable identity, so it is set once and never edited. */
  codeDisabled?: boolean;
}

export function InspectionPlanFormFields({ form, codeDisabled }: InspectionPlanFormFieldsProps) {
  const { data: categories = [] } = useCategories();
  const scope = form.watch("scope");
  const samplingMethod = form.watch("samplingMethod");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="INBOUND-ELECTRONICS" disabled={codeDisabled} {...field} />
              </FormControl>
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
                <Input placeholder="Electronics intake check" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="What this plan is for" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Applies to</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {PLAN_SCOPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {PLAN_SCOPE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              The most specific plan wins: a variant beats a category beats every product.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {scope === "CATEGORY" ? (
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {scope === "PRODUCT_VARIANT" ? (
        <FormField
          control={form.control}
          name="productVariantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variant</FormLabel>
              <FormControl>
                <ProductVariantCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Variant"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="appliesOnReceipt"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2">
              <div className="space-y-0.5">
                <FormLabel>On receipt</FormLabel>
                <FormDescription>Goods receipts are held until inspected.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="appliesOnReturn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2">
              <div className="space-y-0.5">
                <FormLabel>On return</FormLabel>
                <FormDescription>Returned goods are inspected before restock.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <SamplingFields form={form} samplingMethod={samplingMethod} />
    </div>
  );
}

interface SamplingFieldsProps {
  form: UseFormReturn<InspectionPlanFormValues>;
  samplingMethod: InspectionPlanFormValues["samplingMethod"];
}

function SamplingFields({ form, samplingMethod }: SamplingFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="samplingMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sampling</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {SAMPLING_METHODS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {SAMPLING_METHOD_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {samplingMethod === "ALL" ? null : (
          <FormField
            control={form.control}
            name="sampleValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {samplingMethod === "PERCENTAGE" ? "Percentage" : "Units per delivery"}
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder={samplingMethod === "PERCENTAGE" ? "10" : "5"}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <FormField
        control={form.control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Inspector instructions</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="What to check, and what fails" {...field} />
            </FormControl>
            <FormDescription>
              The whole delivery is held until a verdict, whatever the sample size — a failed
              sample condemns the batch it came from.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
