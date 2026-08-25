"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import {
  useCreateBankAccount,
  useStatementMappingPresets,
} from "@/hooks/api/accounting/banking";
import { textOrUndefined } from "../lib/form-values";
import { bankAccountFormSchema, type BankAccountFormValues } from "./bank-account-schema";

type IdentifierScheme = BankAccountFormValues["identifierScheme"];

const IDENTIFIER_ORDER: readonly IdentifierScheme[] = [
  "IFSC_ACCOUNT",
  "IBAN",
  "ROUTING_ACCOUNT",
  "SORT_ACCOUNT",
  "BSB_ACCOUNT",
  "UPI",
  "OTHER",
];

const IDENTIFIER_LABELS: Readonly<Record<IdentifierScheme, string>> = {
  IFSC_ACCOUNT: "IFSC and account number",
  IBAN: "IBAN",
  ROUTING_ACCOUNT: "Routing and account number",
  SORT_ACCOUNT: "Sort code and account number",
  BSB_ACCOUNT: "BSB and account number",
  UPI: "UPI handle",
  OTHER: "Something else",
};

interface AddBankAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCurrency: string;
  defaultCountryCode: string;
}

export function AddBankAccountSheet({
  open,
  onOpenChange,
  defaultCurrency,
  defaultCountryCode,
}: AddBankAccountSheetProps) {
  const accountsQuery = usePostableAccounts();
  const presetsQuery = useStatementMappingPresets();
  const createBankAccount = useCreateBankAccount();

  const cashAccountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsQuery.data ?? [])
        .filter((account) => account.isCash)
        .map((account) => ({ value: account.id, label: account.name, sublabel: account.code })),
    [accountsQuery.data],
  );

  const defaultValues = useMemo<BankAccountFormValues>(
    () => ({
      accountId: "",
      displayName: "",
      bankName: "",
      currency: defaultCurrency,
      countryCode: defaultCountryCode,
      identifierScheme: "IFSC_ACCOUNT",
      identifierValue: "",
      branchIdentifier: "",
      csvMappingPreset: "",
    }),
    [defaultCurrency, defaultCountryCode],
  );

  function handleSubmit(values: BankAccountFormValues): void {
    createBankAccount.mutate(
      {
        accountId: values.accountId,
        displayName: values.displayName.trim(),
        bankName: textOrUndefined(values.bankName),
        currency: values.currency.toUpperCase(),
        countryCode: values.countryCode.toUpperCase(),
        identifierScheme: values.identifierScheme,
        identifierValue: textOrUndefined(values.identifierValue),
        branchIdentifier: textOrUndefined(values.branchIdentifier),
        csvMappingPreset: textOrUndefined(values.csvMappingPreset),
      },
      {
        onSuccess: () => {
          toast.success("Bank account added");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<BankAccountFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Add a bank account"
      description="Bank details hang off a cash account your chart already has."
      resolver={zodResolver(bankAccountFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={createBankAccount.isPending}
      submitLabel="Add account"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cash account in your books</FormLabel>
                <FormControl>
                  <Combobox
                    options={cashAccountOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose a cash account"
                    searchPlaceholder="Search accounts…"
                    emptyText="No cash account found. Add one to your chart first."
                  />
                </FormControl>
                <FormDescription>
                  The account this bank balance is already tracked in.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What you call it</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Current account — 4402" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="HDFC Bank" />
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
                  <FormLabel>Statements arrive in</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="identifierScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How the account is identified</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {IDENTIFIER_ORDER.map((scheme) => (
                        <SelectItem key={scheme} value={scheme}>
                          {IDENTIFIER_LABELS[scheme]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="identifierValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="HDFC0001234" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="csvMappingPreset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statement layout</FormLabel>
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="none">Decide when I import</SelectItem>
                    {(presetsQuery.data?.presets ?? []).map((preset) => (
                      <SelectItem key={preset.code} value={preset.code}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  You can change this every time you import, and save the change.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
