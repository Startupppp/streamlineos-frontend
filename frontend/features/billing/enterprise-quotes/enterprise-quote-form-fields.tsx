"use client";

import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import type { CreateEnterpriseQuotePayload } from "@/hooks/api/billing/enterprise-quotes";
import { CONTRACT_TERMS, type CreateEnterpriseQuoteForm } from "./enterprise-quote-schema";

interface EnterpriseQuoteFormFieldsProps {
  form: UseFormReturn<CreateEnterpriseQuoteForm, unknown, CreateEnterpriseQuotePayload>;
}

export function EnterpriseQuoteFormFields({ form }: EnterpriseQuoteFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subject</FormLabel>
            <FormControl>
              <Input placeholder="Enterprise plan — 3-year agreement" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="requestedSeats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested seats</FormLabel>
              <FormControl>
                <Input inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="negotiatedSeats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Negotiated seats</FormLabel>
              <FormControl>
                <Input inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="pricePerSeat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price per seat / month (₹)</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder="1499" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contractTermMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract term</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {CONTRACT_TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term} months
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
        name="validUntil"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valid until</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
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
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
