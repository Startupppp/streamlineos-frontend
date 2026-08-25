"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import type { EditAccountFormValues } from "./account-form-schema";

const NO_PARENT = "__none__";

interface EditFieldsProps {
  form: UseFormReturn<EditAccountFormValues>;
  parentOptions: ComboboxOption[];
  currencyOptions: ComboboxOption[];
}

export function EditAccountFormFields({
  form,
  parentOptions,
  currencyOptions,
}: EditFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="parentAccountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sits under</FormLabel>
            <FormControl>
              <Combobox
                options={[{ value: NO_PARENT, label: "Top level" }, ...parentOptions]}
                value={field.value === "" ? NO_PARENT : field.value}
                onChange={(value) => field.onChange(value === NO_PARENT ? "" : value)}
                placeholder="Top level"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="currencyRestriction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Locked to one currency</FormLabel>
            <FormControl>
              <Combobox
                options={[{ value: NO_PARENT, label: "Any currency" }, ...currencyOptions]}
                value={field.value === "" ? NO_PARENT : field.value}
                onChange={(value) => field.onChange(value === NO_PARENT ? "" : value)}
                placeholder="Any currency"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isCash"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <FormLabel>This is a bank or cash account</FormLabel>
              <FormDescription>Cash accounts drive the cash flow statement.</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <FormLabel>In use</FormLabel>
              <FormDescription>
                Turning this off hides the account from new postings. Its history stays.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
