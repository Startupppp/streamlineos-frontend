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
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
  useUpsertExchangeRate,
} from "@/hooks/api/accounting/settings";
import type { ApprovalPolicy } from "@/types/accounting/taxes";
import {
  RECORD_TYPES,
  isApprovalRecordType,
  policySchema,
  rateSchema,
  type PolicyFormValues,
  type RateFormValues,
} from "./fin-settings-dialogs-schema";

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

