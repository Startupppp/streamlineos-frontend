"use client";

import type { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { PartyPicker } from "../parties/party-picker";
import { SUPPLY_NATURE_OPTIONS } from "./ar-labels";
import { ArDocumentLineEditor } from "./ar-document-line-editor";
import type { ArDocumentFormValues } from "./ar-document-schema";

interface ArDocumentFormProps {
  form: UseFormReturn<ArDocumentFormValues>;
  errorLineIndex?: number;
  disabled?: boolean;
  lockCustomer?: boolean;
}

export function ArDocumentForm({
  form,
  errorLineIndex,
  disabled = false,
  lockCustomer = false,
}: ArDocumentFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Who and when</CardTitle>
          <CardDescription>
            Leave the due date blank and we use the payment terms on their record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <PartyPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={disabled || lockCustomer}
                    />
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
                  <FormLabel>Bill in</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} className="uppercase" disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={disabled}
                      dateFormat="dd MMM yyyy"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment due</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={disabled}
                      placeholder="Use their payment terms"
                      dateFormat="dd MMM yyyy"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="supplyNature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of sale</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {SUPPLY_NATURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Decides which tax rules apply.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Their reference</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="PO-4471" disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="taxInclusive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <div className="space-y-0.5">
                  <FormLabel>Prices already include tax</FormLabel>
                  <FormDescription>
                    Turn on when you quote a single all-in price and we back the tax out.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you are billing</CardTitle>
          <CardDescription>
            Tax is worked out by the books, not here, so totals appear once you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArDocumentLineEditor form={form} errorLineIndex={errorLineIndex} disabled={disabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Note on the invoice</CardTitle>
          <CardDescription>Anything the customer should read.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Note</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Thanks for your business."
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
