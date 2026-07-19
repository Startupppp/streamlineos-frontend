"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useAccounts } from "@/hooks/api/accounting";
import { useCreateBankAccount } from "@/hooks/api/accounting/banking";
import type { BankAccountType } from "@/hooks/api/accounting/banking";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  accountType: z.enum(["BANK", "CASH", "CARD", "WALLET"]),
  bankName: z.string().optional(),
  accountNumberMasked: z.string().optional(),
  ifsc: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  openingBalance: z
    .string()
    .min(1)
    .refine((v) => !isNaN(parseFloat(v)), { message: "Must be a number" }),
  openingBalanceDate: z.string().optional(),
  ledgerAccountId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ACCOUNT_TYPES: Array<{ value: BankAccountType; label: string }> = [
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "WALLET", label: "Wallet" },
];

interface AddBankAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankAccountSheet({ open, onOpenChange }: AddBankAccountSheetProps) {
  const createMutation = useCreateBankAccount();
  const accountsQuery = useAccounts({ pageSize: 200 });
  const ledgerAccounts = accountsQuery.data?.items ?? [];

  function handleSubmit(values: FormValues) {
    createMutation.mutate(
      {
        name: values.name,
        accountType: values.accountType,
        bankName: values.bankName || undefined,
        accountNumberMasked: values.accountNumberMasked || undefined,
        ifsc: values.ifsc || undefined,
        currency: values.currency,
        openingBalance: values.openingBalance,
        openingBalanceDate: values.openingBalanceDate || undefined,
        ledgerAccountId: values.ledgerAccountId
          ? parseInt(values.ledgerAccountId, 10)
          : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <EntityFormSheet<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Add Bank Account"
      description="Connect a bank, cash, card, or wallet account."
      resolver={zodResolver(schema)}
      defaultValues={{
        name: "",
        accountType: "BANK",
        bankName: "",
        accountNumberMasked: "",
        ifsc: "",
        currency: "INR",
        openingBalance: "0",
        openingBalanceDate: "",
        ledgerAccountId: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
      submitLabel="Add Account"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. HDFC Current Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumberMasked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. XXXX1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="ifsc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC0001234" {...field} />
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
                    <Input placeholder="INR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openingBalanceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ledgerAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Ledger Account (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {ledgerAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
