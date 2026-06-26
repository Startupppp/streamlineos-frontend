"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validation/hr";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepBankingProps {
  form: UseFormReturn<FormValues>;
}

export function StepBanking({ form }: StepBankingProps) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="bankDetails.accountHolder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Holder Name</FormLabel>
              <FormControl>
                <Input placeholder="Name as per bank records" {...field} onChange={(e) => {
                  if (/^[A-Za-z\s]*$/.test(e.target.value)) field.onChange(e.target.value);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankDetails.bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Chase, HDFC" {...field} onChange={(e) => {
                  if (/^[A-Za-z\s]*$/.test(e.target.value)) field.onChange(e.target.value);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankDetails.branch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Down Town Branch" {...field} onChange={(e) => {
                  if (/^[A-Za-z\s]*$/.test(e.target.value)) field.onChange(e.target.value);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankDetails.accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input placeholder="XXXX-XXXX-XXXX" inputMode="numeric" {...field} onChange={(e) => {
                  if (/^\d*$/.test(e.target.value)) field.onChange(e.target.value);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankDetails.ifsc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Routing / IFSC Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. SBIN0001234" {...field} onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  if (/^[A-Z0-9]*$/.test(v) && v.length <= 11) field.onChange(v);
                }} maxLength={11} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-2">
        <p className="text-sm font-medium text-muted-foreground mb-3">Statutory Details (Optional)</p>
        <FormField
          control={form.control}
          name="bankDetails.pfUanNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PF / UAN Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. 100123456789"
                  {...field}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 12) field.onChange(v);
                  }}
                  maxLength={12}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">Optional: Required only if PF is applicable</p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
