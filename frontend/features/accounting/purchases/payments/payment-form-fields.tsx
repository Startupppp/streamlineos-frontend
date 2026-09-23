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
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import type {
  ApDocumentSummary,
  VendorSummary,
} from "@/types/accounting/accounting-ap";
import { VendorPickerField } from "../bills/vendor-picker-field";
import type { PaymentFormValues } from "./payment-form-schema";

interface PaymentFormFieldsProps {
  form: UseFormReturn<PaymentFormValues>;
  openBills: ApDocumentSummary[];
  isLoadingBills: boolean;
  onVendorChange: (partyId: string, vendor: VendorSummary | undefined) => void;
}

export function PaymentFormFields({
  form,
  openBills,
  isLoadingBills,
  onVendorChange,
}: PaymentFormFieldsProps) {
  const accountsQuery = usePostableAccounts();
  const currency = form.watch("currency") || "INR";
  const withholdingMode = form.watch("withholdingMode");

  const cashAccountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsQuery.data ?? [])
        .filter((account) => account.isCash)
        .map((account) => ({
          value: account.id,
          label: account.name,
          sublabel: account.code,
        })),
    [accountsQuery.data],
  );

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="partyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Who you are paying</FormLabel>
            <FormControl>
              <VendorPickerField
                value={field.value}
                onChange={onVendorChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date the money left</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
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
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input {...field} maxLength={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="paymentAccountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Paid from</FormLabel>
            <FormControl>
              <Combobox
                options={cashAccountOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose a bank or cash account"
                searchPlaceholder="Search accounts…"
                emptyText="No cash account found."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold">Which bills this covers</p>
        {isLoadingBills ? (
          <p className="text-label text-muted-foreground">
            Looking up their unpaid bills…
          </p>
        ) : openBills.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-label text-muted-foreground">
            Nothing outstanding for this vendor. A payment with no bills behind
            it sits as money on account until you allocate it.
          </p>
        ) : (
          openBills.map((bill, index) => (
            <div
              key={bill.id}
              className="rounded-md border border-border/70 bg-card p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {bill.vendorDocumentNumber ??
                      bill.documentNumber ??
                      "Unnumbered bill"}
                  </p>
                  <p className="text-dense text-muted-foreground">
                    Dated {formatShortDate(bill.issueDate)} · still owed{" "}
                    {formatMinorMoney(bill.openMinor, bill.currency)}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <FormField
                    control={form.control}
                    name={`amounts.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            inputMode="decimal"
                            className="tabular-nums text-right"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <FormField
        control={form.control}
        name="grossAmount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              What they invoiced, before anything is held back
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="decimal"
                className="tabular-nums"
                placeholder="Leave blank to use the total above"
              />
            </FormControl>
            <FormDescription>
              Amounts are in {currency}. The books work out what actually leaves
              the account: the gross less anything withheld.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="withholdingMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tax held back from this payment</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value="auto">
                  Work it out from the vendor&apos;s code
                </SelectItem>
                <SelectItem value="manual">
                  I will state the rate or amount
                </SelectItem>
                <SelectItem value="none">Nothing is held back</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {withholdingMode === "manual" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="withholdingCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="194J" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="withholdingRatePercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate %</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    className="tabular-nums"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="withholdingAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Or amount</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    className="tabular-nums"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How you paid</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Bank transfer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input {...field} placeholder="UTR / cheque number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="memo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
