"use client";

import { useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import type { VendorFormValues } from "./vendor-form-schema";

interface VendorFormFieldsProps {
  form: UseFormReturn<VendorFormValues>;
}

export function VendorFormFields({ form }: VendorFormFieldsProps) {
  const accountsQuery = usePostableAccounts();

  const expenseAccountOptions = useMemo<ComboboxOption[]>(() => {
    const accounts = accountsQuery.data ?? [];
    return accounts
      .filter((account) => account.accountType === "EXPENSE" || account.accountType === "ASSET")
      .map((account) => ({
        value: account.id,
        label: account.name,
        sublabel: account.code,
      }));
  }, [accountsQuery.data]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vendor name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Acme Supplies" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="legalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Registered name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Acme Supplies Private Limited" />
            </FormControl>
            <FormDescription>What appears on their invoices, if it differs.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ap@acme.com" />
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
                <Input {...field} placeholder="+91 98765 43210" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input {...field} maxLength={2} placeholder="IN" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultCurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bills in</FormLabel>
              <FormControl>
                <Input {...field} maxLength={3} placeholder="INR" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="billingCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Bengaluru" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billingRegion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State or region</FormLabel>
              <FormControl>
                <Input {...field} placeholder="KA" />
              </FormControl>
              <FormDescription>Used to work out the tax on their bills.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="defaultExpenseAccountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Where their spending usually goes</FormLabel>
            <FormControl>
              <Combobox
                options={expenseAccountOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Pick an account"
                searchPlaceholder="Search accounts…"
                emptyText="No matching account."
              />
            </FormControl>
            <FormDescription>New bill lines start on this account.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="paymentTermsDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days to pay</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" className="tabular-nums" />
              </FormControl>
              <FormDescription>Sets the due date on a new bill.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="withholdingCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax withholding code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="194J" />
              </FormControl>
              <FormDescription>
                Leave empty when nothing is held back from what you pay them.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>You also sell to them</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value="vendor">No, we only buy from them</SelectItem>
                <SelectItem value="both">Yes, they are a customer too</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <FormLabel>Still trading with them</FormLabel>
              <FormDescription>Turn this off to keep them out of new bills.</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
