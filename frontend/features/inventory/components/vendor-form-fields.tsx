"use client";

import { type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { VendorEditFormValues } from "@/features/inventory/lib/vendor-schema";

interface VendorFormFieldsProps {
  form: UseFormReturn<VendorEditFormValues>;
  formId: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  showIsActive?: boolean;
}

export function VendorFormFields({ form, formId, onSubmit, showIsActive }: VendorFormFieldsProps) {
  return (
    <Form {...form}>
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Acme Supplies" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-generated" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="INR" maxLength={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="orders@supplier.com" {...field} />
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
                <PhoneInput defaultCountry="IN" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gstin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GSTIN</FormLabel>
              <FormControl>
                <Input
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="uppercase"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="leadTimeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead time (days)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="365" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentTermsDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment terms (days)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="365" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Street, city, state, PIN" className="resize-none" {...field} />
              </FormControl>
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
                <Textarea rows={2} placeholder="Any internal notes" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showIsActive && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <FormLabel className="mb-0 cursor-pointer">Active</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
