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
import { PhoneInput } from "@/components/ui/phone-input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  branchFormSchema,
  EMPTY_BRANCH_FORM_VALUES,
  type BranchFormValues,
} from "./branch-form-schema";

interface BranchFormProps {
  defaultValues?: BranchFormValues;
  selectedBusinessUnitName?: string | null;
  onSubmit: (values: BranchFormValues) => void;
}

export function BranchForm({
  defaultValues,
  selectedBusinessUnitName,
  onSubmit,
}: BranchFormProps) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: defaultValues ?? EMPTY_BRANCH_FORM_VALUES,
  });

  return (
    <Form {...form}>
      <form
        id="branch-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Mumbai HQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                      placeholder="e.g. MUM"
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
            name="businessUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Unit</FormLabel>
                <FormControl>
                  <HierarchyParentSelector
                    parentKind="BUSINESS_UNIT"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    label="Business unit"
                    placeholder="Select a business unit"
                    searchPlaceholder="Search business units…"
                    emptyText="No active business units found."
                    selectedLabel={selectedBusinessUnitName}
                    optionalLabel="No business unit"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="managerUserId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Manager</FormLabel>
                <FormControl>
                  <UserCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select manager…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 400001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <PhoneInput {...field} defaultCountry="IN" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="branch@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
