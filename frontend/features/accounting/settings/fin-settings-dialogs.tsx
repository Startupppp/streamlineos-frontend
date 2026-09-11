"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "@/hooks/api/accounting/fin-settings";
import { useUpsertExchangeRate } from "@/hooks/api/accounting/settings";
import { useAccounts } from "@/hooks/api/accounting";
import type { NumberSequence, SystemAccountMapping } from "@/types/accounting/fin-settings";
import { PURPOSE_LABELS } from "./fin-settings-labels";

export { PolicyDialog } from "./approval-policy-dialog";
export { PaymentTermDialog } from "./payment-term-dialog";

const sequenceSchema = z.object({
  prefix: z.string().min(1),
  padding: z.string().min(1),
  nextNumber: z.string().min(1),
});
type SequenceFormValues = z.infer<typeof sequenceSchema>;

const systemAccountSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
});
type SystemAccountFormValues = z.infer<typeof systemAccountSchema>;

const rateSchema = z.object({
  fromCurrency: z.string().min(1),
  toCurrency: z.string().min(1),
  rate: z.string().min(1),
  asOfDate: z.string().min(1),
});
type RateFormValues = z.infer<typeof rateSchema>;

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
  const accountsQuery = useAccounts({ limit: 100 });
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
      title={`Map account — ${PURPOSE_LABELS[mapping.purpose]}`}
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
          {form.formState.errors.accountId && (
            <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
          )}
        </div>
        );
      }}
    </EntityFormDialog>
  );
}

export function RateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const upsert = useUpsertExchangeRate();

  function handleSubmit(values: RateFormValues) {
    upsert.mutate(values, {
      onSuccess: () => { toast.success("Exchange rate saved"); onOpenChange(false); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add exchange rate"
      resolver={zodResolver(rateSchema)}
      defaultValues={{ fromCurrency: "", toCurrency: "", rate: "", asOfDate: "" }}
      onSubmit={handleSubmit}
      isSubmitting={upsert.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From currency</Label>
              <Input {...form.register("fromCurrency")} placeholder="USD" />
              {form.formState.errors.fromCurrency && <p className="text-xs text-destructive">{form.formState.errors.fromCurrency.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>To currency</Label>
              <Input {...form.register("toCurrency")} placeholder="INR" />
              {form.formState.errors.toCurrency && <p className="text-xs text-destructive">{form.formState.errors.toCurrency.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rate</Label>
            <Input {...form.register("rate")} placeholder="83.25" />
            {form.formState.errors.rate && <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>As of date</Label>
            <Input {...form.register("asOfDate")} type="date" />
            {form.formState.errors.asOfDate && <p className="text-xs text-destructive">{form.formState.errors.asOfDate.message}</p>}
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}
