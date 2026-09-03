"use client";

import type { ChangeEvent } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validation/hr";
import { codeFieldChange, digitsFieldChange } from "@/lib/code-field";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { latinNameFieldChange, digitsOnlyFieldChange } from "./restricted-field-change";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const ESI_NUMBER_MAX_LENGTH = 20;

/**
 * An ESI number is free text with a length cap rather than a code, so it keeps
 * its own rule. Truncating a long paste is the point: the previous test
 * rejected the whole edit, and a controlled input then put the old value back
 * with nothing said about why.
 */
function esiNumberChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleEsiNumberChange(event) {
    onChange(event.target.value.trim().slice(0, ESI_NUMBER_MAX_LENGTH));
  };
}

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
                <Input placeholder="Name as per bank records" {...field} onChange={latinNameFieldChange(field.onChange)} />
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
                <Input placeholder="e.g. Chase, HDFC" {...field} onChange={latinNameFieldChange(field.onChange)} />
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
                <Input placeholder="e.g. Down Town Branch" {...field} onChange={latinNameFieldChange(field.onChange)} />
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
                <Input placeholder="XXXX-XXXX-XXXX" inputMode="numeric" {...field} onChange={digitsOnlyFieldChange(field.onChange)} />
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
                <Input
                  placeholder="e.g. SBIN0001234"
                  {...field}
                  onChange={codeFieldChange(field.onChange, 11)}
                  maxLength={11}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-2 space-y-3">
        <p className="text-sm font-medium text-muted-foreground mb-1">Statutory Details (Optional)</p>
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
                  onChange={digitsFieldChange(field.onChange, 12)}
                  maxLength={12}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                12 digits. Needed for PF ECR export when PF is enabled.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankDetails.esiIpNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ESI IP Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="ESIC Insurance Person number"
                  {...field}
                  onChange={esiNumberChange(field.onChange)}
                  maxLength={20}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Optional until ESI is enabled; used in ESI filing export.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
