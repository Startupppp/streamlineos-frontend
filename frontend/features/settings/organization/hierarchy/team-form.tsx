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
  EMPTY_TEAM_FORM_VALUES,
  teamFormSchema,
  type TeamFormValues,
} from "./team-form-schema";

interface TeamFormProps {
  defaultValues?: Partial<TeamFormValues>;
  selectedDepartmentName?: string | null;
  onSubmit: (values: TeamFormValues) => void;
}

export function TeamForm({
  defaultValues,
  selectedDepartmentName,
  onSubmit,
}: TeamFormProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    reValidateMode: "onChange",
    defaultValues: {
      ...EMPTY_TEAM_FORM_VALUES,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form
        id="team-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Frontend Team" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
                field.onChange(event.target.value.toUpperCase());
              }

              return (
                <FormItem className="min-w-0">
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FE"
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
            name="capacity"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Optional"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl>
                <HierarchyParentSelector
                  parentKind="DEPARTMENT"
                  value={field.value}
                  onValueChange={field.onChange}
                  label="Department"
                  placeholder="Select a department"
                  searchPlaceholder="Search departments…"
                  emptyText="No active departments found."
                  selectedLabel={selectedDepartmentName}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="leadUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Lead</FormLabel>
              <FormControl>
                <UserCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select team lead…"
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
