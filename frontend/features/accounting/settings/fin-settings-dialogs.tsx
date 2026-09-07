"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
  useUpsertExchangeRate,
} from "@/hooks/api/accounting/settings";
import { useAllAccounts } from "@/hooks/api/accounting";
import { AccountListNotice } from "@/features/accounting/shared";
import type { NumberSequence, SystemAccountMapping, PaymentTerm } from "@/types/accounting/fin-settings";
import type { ApprovalPolicy, ApprovalRecordType } from "@/types/accounting/taxes";
import { getPurposeLabel } from "./fin-settings-labels";

const RECORD_TYPES: ReadonlyArray<string> = [
  "MANUAL_JOURNAL", "PURCHASE_BILL", "VENDOR_PAYMENT",
  "EXPENSE", "CREDIT_NOTE", "PERIOD_REOPEN", "BANK_ADJUSTMENT",
];

function isApprovalRecordType(value: string): value is ApprovalRecordType {
  return RECORD_TYPES.includes(value);
}

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

const policySchema = z.object({
  recordType: z.enum(["MANUAL_JOURNAL", "PURCHASE_BILL", "VENDOR_PAYMENT", "EXPENSE", "CREDIT_NOTE", "PERIOD_REOPEN", "BANK_ADJUSTMENT"]),
  minAmount: z.string(),
  approverRole: z.string(),
  isActive: z.boolean(),
});
type PolicyFormValues = z.infer<typeof policySchema>;

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

export function PolicyDialog({
  policy,
  open,
  onOpenChange,
}: {
  policy: ApprovalPolicy | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateApprovalPolicy();
  const update = useUpdateApprovalPolicy(policy?.id ?? 0);
  const isPending = policy ? update.isPending : create.isPending;

  function handleSubmit(values: PolicyFormValues) {
    const payload = {
      recordType: values.recordType,
      minAmount: values.minAmount || undefined,
      approverRole: values.approverRole || undefined,
      isActive: values.isActive,
    };
    const onSuccess = () => { toast.success(policy ? "Policy updated" : "Policy created"); onOpenChange(false); };
    const onError = (err: Error) => toast.error(getErrorMessage(err));
    if (policy) { update.mutate(payload, { onSuccess, onError }); }
    else { create.mutate(payload, { onSuccess, onError }); }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={policy ? "Edit approval policy" : "Add approval policy"}
      resolver={zodResolver(policySchema)}
      defaultValues={{
        recordType: policy && isApprovalRecordType(policy.recordType) ? policy.recordType : "MANUAL_JOURNAL",
        minAmount: policy?.minAmount ?? "",
        approverRole: policy?.approverRole ?? "",
        isActive: policy?.isActive ?? true,
      }}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      resetOnOpen
    >
      {(form) => {
        function handleRecordTypeChange(v: string): void {
          if (isApprovalRecordType(v)) form.setValue("recordType", v, { shouldValidate: true });
        }

        return (
        <>
          <div className="space-y-1.5">
            <Label>Record type</Label>
            <Select
              value={form.watch("recordType")}
              onValueChange={handleRecordTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>{rt.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Min amount (optional)</Label>
            <Input {...form.register("minAmount")} placeholder="e.g. 1000" />
          </div>
          <div className="space-y-1.5">
            <Label>Approver role (optional)</Label>
            <Input {...form.register("approverRole")} placeholder="e.g. FINANCE_MANAGER" />
          </div>
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="policy-isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="policy-isActive" className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </>
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

const paymentTermSchema = z.object({
  label: z.string().min(1, "Label is required"),
  days: z.string().min(1, "Days is required"),
  isDefault: z.boolean(),
});
type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

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
