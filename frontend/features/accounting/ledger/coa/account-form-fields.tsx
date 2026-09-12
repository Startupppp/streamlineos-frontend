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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type CreateAccountFormValues,
} from "./account-form-schema";

const NO_PARENT = "__none__";

interface CreateFieldsProps {
  form: UseFormReturn<CreateAccountFormValues>;
  parentOptions: ComboboxOption[];
  currencyOptions: ComboboxOption[];
}

export function CreateAccountFormFields({
  form,
  parentOptions,
  currencyOptions,
}: CreateFieldsProps) {
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
                <Input placeholder="4100" {...field} />
              </FormControl>
              <FormDescription>How accountants find this account.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What kind of account is it?</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACCOUNT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Consulting income" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <ParentField form={form} parentOptions={parentOptions} />

      <FormField
        control={form.control}
        name="isHeader"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <FormLabel>Grouping only</FormLabel>
              <FormDescription>
                A grouping account holds other accounts and can never be posted to.
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

      <CurrencyField form={form} currencyOptions={currencyOptions} />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Input placeholder="What belongs in this account" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function ParentField({
  form,
  parentOptions,
}: {
  form: UseFormReturn<CreateAccountFormValues>;
  parentOptions: ComboboxOption[];
}) {
  return (
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
  );
}

function CurrencyField({
  form,
  currencyOptions,
}: {
  form: UseFormReturn<CreateAccountFormValues>;
  currencyOptions: ComboboxOption[];
}) {
  return (
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
          <FormDescription>
            Postings in any other currency will be refused.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
