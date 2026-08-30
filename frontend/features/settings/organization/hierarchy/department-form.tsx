"use client";

import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  departmentFormSchema,
  EMPTY_DEPARTMENT_FORM_VALUES,
  type DepartmentFormValues,
} from "./department-form-schema";

interface DepartmentFormProps {
  defaultValues?: DepartmentFormValues;
  selectedBranchName?: string | null;
  onSubmit: (values: DepartmentFormValues) => void;
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

  return (
    <Form {...form}>
      <form
        id="department-form"
        onSubmit={form.handleSubmit(onSubmit)}
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
