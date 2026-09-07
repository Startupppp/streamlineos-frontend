"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateNumberSequence,
  useUpsertSystemAccount,
  useUpdatePaymentTerms,
} from "@/hooks/api/accounting/fin-settings";
import { useAllAccounts } from "@/hooks/api/accounting";
import { AccountListNotice } from "@/features/accounting/shared";
import type { NumberSequence, SystemAccountMapping, PaymentTerm } from "@/types/accounting/fin-settings";
import { getPurposeLabel } from "./fin-settings-labels";
import {
  sequenceSchema,
  systemAccountSchema,
  paymentTermSchema,
  type SequenceFormValues,
  type SystemAccountFormValues,
  type PaymentTermFormValues,
} from "./fin-settings-dialogs-schema";

export function SequenceEditDialog({
  seq,
  open,
  onOpenChange,
}: {
  seq: NumberSequence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateSeq = useUpdateNumberSequence(seq.entityType);

  function handleSubmit(values: SequenceFormValues) {
    updateSeq.mutate(
      { prefix: values.prefix, padding: Number(values.padding), nextNumber: Number(values.nextNumber) },
      {
        onSuccess: () => { toast.success("Sequence updated"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit sequence — ${seq.entityType}`}
      resolver={zodResolver(sequenceSchema)}
      defaultValues={{ prefix: seq.prefix, padding: String(seq.padding), nextNumber: String(seq.nextNumber) }}
      onSubmit={handleSubmit}
      isSubmitting={updateSeq.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prefix <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="INV-" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="padding"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Padding digits <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} max={10} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next number <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}

export function SystemAccountMapDialog({
  mapping,
  open,
  onOpenChange,
}: {
  mapping: SystemAccountMapping;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const upsert = useUpsertSystemAccount(mapping.purpose);
  const accountsQuery = useAllAccounts();
  const accounts = accountsQuery.data?.data ?? [];

  function handleSubmit(values: SystemAccountFormValues) {
    upsert.mutate(
      { accountId: Number(values.accountId) },
      {
        onSuccess: () => { toast.success("Account mapped"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Map account — ${getPurposeLabel(mapping.purpose)}`}
      resolver={zodResolver(systemAccountSchema)}
      defaultValues={{ accountId: mapping.accountId ? String(mapping.accountId) : "" }}
      onSubmit={handleSubmit}
      isSubmitting={upsert.isPending}
      resetOnOpen
    >
      {(form) => {
        function handleAccountChange(v: string): void {
          form.setValue("accountId", v, { shouldValidate: true });
        }

        return (
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select
            value={form.watch("accountId")}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={String(acc.id)}>
                  {acc.code} — {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AccountListNotice query={accountsQuery} />
          {form.formState.errors.accountId && (
            <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
          )}
        </div>
        );
      }}
    </EntityFormDialog>
  );
}

export function PaymentTermDialog({
  term,
  existingTerms,
  open,
  onOpenChange,
}: {
  term: PaymentTerm | null;
  existingTerms: PaymentTerm[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateTerms = useUpdatePaymentTerms();

  function handleSubmit(values: PaymentTermFormValues) {
    const days = Number(values.days);
    const key = term?.key ?? values.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    let updated: PaymentTerm[];

    if (term) {
      updated = existingTerms.map((t) =>
        t.key === term.key
          ? { key, label: values.label, days, isDefault: values.isDefault }
          : values.isDefault ? { ...t, isDefault: false } : t,
      );
    } else {
      const withoutDefault = values.isDefault
        ? existingTerms.map((t) => ({ ...t, isDefault: false }))
        : existingTerms;
      updated = [...withoutDefault, { key, label: values.label, days, isDefault: values.isDefault }];
    }

    updateTerms.mutate(
      { terms: updated },
      {
        onSuccess: () => { toast.success(term ? "Payment term updated" : "Payment term added"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={term ? "Edit payment term" : "Add payment term"}
      resolver={zodResolver(paymentTermSchema)}
      defaultValues={{
        label: term?.label ?? "",
        days: term ? String(term.days) : "",
        isDefault: term?.isDefault ?? false,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateTerms.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Net 30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0} placeholder="30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="term-isDefault"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="term-isDefault" className="!mt-0">Set as default</FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
