"use client";

import { useForm } from "react-hook-form";
import { quoteSettingsFormSchema, type QuoteSettingsFormValues } from "./quote-settings-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import type { QuoteSettings } from "@/types/crm/pricebooks";

export type { QuoteSettingsFormValues };

interface QuoteSettingsFormProps {
  settings: QuoteSettings | undefined;
  onSubmit: (values: QuoteSettingsFormValues) => void;
  isPending: boolean;
}

export function QuoteSettingsForm({ settings, onSubmit, isPending }: QuoteSettingsFormProps) {
  const form = useForm<QuoteSettingsFormValues>({
    resolver: zodResolver(quoteSettingsFormSchema),
    values: settings
      ? {
          maxDiscountPercent: settings.maxDiscountPercent,
          requirePricebookPrice: settings.requirePricebookPrice,
          defaultExpiryDays: settings.defaultExpiryDays,
          allowPriceOverride: settings.allowPriceOverride,
        }
      : {
          maxDiscountPercent: null,
          requirePricebookPrice: false,
          defaultExpiryDays: 30,
          allowPriceOverride: true,
        },
  });

  function handleSubmit(values: QuoteSettingsFormValues) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="defaultExpiryDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Quote Expiry (days) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? 30 : Number(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxDiscountPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Discount (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="No limit"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? null : Number(val));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="requirePricebookPrice"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Require Pricebook Price</FormLabel>
                <FormDescription>
                  When enabled, product prices must come from a pricebook
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
          name="allowPriceOverride"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Allow Price Override</FormLabel>
                <FormDescription>
                  Allow sales reps to override pricebook prices on quotes
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <LoadingButton type="submit" isPending={isPending} loadingText="Saving...">
            Save Settings
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
