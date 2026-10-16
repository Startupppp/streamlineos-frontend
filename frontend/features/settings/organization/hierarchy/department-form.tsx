"use client";

import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { HierarchyParentSelector } from "@/components/organization/hierarchy-parent-selector";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import { getValidationFieldErrors } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  departmentFormSchema,
  EMPTY_DEPARTMENT_FORM_VALUES,
  type DepartmentFormValues,
} from "./department-form-schema";

interface DepartmentFormProps {
  defaultValues?: DepartmentFormValues;
  selectedBranchName?: string | null;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
}

export function DepartmentForm({
  defaultValues,
  selectedBranchName,
  onSubmit,
}: DepartmentFormProps) {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: defaultValues ?? EMPTY_DEPARTMENT_FORM_VALUES,
  });

  async function handleFormSubmit(values: DepartmentFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      const fieldErrors = getValidationFieldErrors(error).filter(
        (issue) => issue.path === "name" || issue.path === "code",
      );
      if (fieldErrors.length === 0) {
        toast.error(getErrorMessage(error));
        return;
      }
      for (const issue of fieldErrors) {
        if (issue.path === "name" || issue.path === "code")
          form.setError(issue.path, { message: issue.message });
      }
    }
  }

  return (
    <Form {...form}>
      <form
        id="department-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Engineering" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
                field.onChange(event.target.value.toUpperCase());
              }

              return (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ENG"
                      {...field}
                      onChange={handleCodeChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl>
                  <HierarchyParentSelector
                    parentKind="BRANCH"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    label="Branch"
                    placeholder="Select a branch"
                    searchPlaceholder="Search branches…"
                    emptyText="No active branches found."
                    selectedLabel={selectedBranchName}
                    optionalLabel="No branch"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="headUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Head</FormLabel>
              <FormControl>
                <UserCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select head…"
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Optional description…"
                  {...field}
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
