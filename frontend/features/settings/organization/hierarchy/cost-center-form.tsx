"use client";

import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OrgCostCenter } from "@/types/org-hierarchy";
import {
  costCenterFormSchema,
  type CostCenterFormValues,
} from "./cost-center-form-schema";
import { submitWithFieldErrors } from "./submit-with-field-errors";

interface CostCenterFormProps {
  defaultValues?: CostCenterFormValues;
  knownCostCenters: readonly Pick<OrgCostCenter, "id" | "code" | "name">[];
  editingId?: string;
  onSubmit: (values: CostCenterFormValues) => Promise<void>;
}

export function CostCenterForm({
  defaultValues,
  knownCostCenters,
  editingId,
  onSubmit,
}: CostCenterFormProps) {
  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: defaultValues ?? { code: "", name: "", description: "" },
  });

  async function handleFormSubmit(values: CostCenterFormValues) {
    const code = values.code.trim().toUpperCase();
    const taken = knownCostCenters.find(
      (costCenter) => costCenter.id !== editingId && costCenter.code.toUpperCase() === code,
    );
    if (taken) {
      form.setError("code", {
        message: `Code '${code}' is already used by the cost center '${taken.name.trim()}'.`,
      });
      return;
    }
    await submitWithFieldErrors(form, ["code", "name"], () => onSubmit(values));
  }

  return (
    <Form {...form}>
      <form id="cc-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
                field.onChange(e.target.value.toUpperCase());
              }
              return (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="CC001" {...field} onChange={handleCodeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Engineering" {...field} />
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
                <Textarea rows={3} placeholder="Optional description…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
