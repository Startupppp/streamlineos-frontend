"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAccountingSettings,
  useUpdateAccountingSettings,
} from "@/hooks/api/accounting/fin-settings";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const companySchema = z.object({
  baseCurrency: z.string().min(1, "Required"),
  fiscalYearStartMonth: z.string().min(1, "Required"),
  accountingBasis: z.enum(["ACCRUAL", "CASH"]),
});
type CompanyFormValues = z.infer<typeof companySchema>;

const taxSchema = z.object({
  gstin: z.string(),
  pan: z.string(),
  stateCode: z.string(),
});
type TaxFormValues = z.infer<typeof taxSchema>;

export interface StepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function StepCompanyCurrency({ onComplete, onSkip }: StepProps) {
  const settingsQuery = useAccountingSettings();
  const updateSettings = useUpdateAccountingSettings();
  const settings = settingsQuery.data;

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    values: settings
      ? {
          baseCurrency: settings.baseCurrency,
          fiscalYearStartMonth: String(settings.fiscalYearStartMonth),
          accountingBasis: settings.accountingBasis,
        }
      : undefined,
  });

  function handleSave(values: CompanyFormValues) {
    updateSettings.mutate(
      {
        baseCurrency: values.baseCurrency,
        fiscalYearStartMonth: Number(values.fiscalYearStartMonth),
        accountingBasis: values.accountingBasis,
      },
      {
        onSuccess: () => { toast.success("Company settings saved"); onComplete(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Company & Currency</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Base currency <span className="text-destructive">*</span></Label>
              <Input
                {...form.register("baseCurrency")}
                className="uppercase"
                placeholder="INR"
              />
              {form.formState.errors.baseCurrency && (
                <p className="text-xs text-destructive">{form.formState.errors.baseCurrency.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Fiscal year start month</Label>
              <Select
                value={form.watch("fiscalYearStartMonth")}
                onValueChange={(v) => form.setValue("fiscalYearStartMonth", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Accounting basis</Label>
              <Select
                value={form.watch("accountingBasis")}
                onValueChange={(v) => form.setValue("accountingBasis", v as "ACCRUAL" | "CASH", { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCRUAL">Accrual</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <LoadingButton type="submit" size="sm" isPending={updateSettings.isPending} loadingText="Saving…">
              Save & continue
            </LoadingButton>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function StepTaxRegistration({ onComplete, onSkip }: StepProps) {
  const settingsQuery = useAccountingSettings();
  const updateSettings = useUpdateAccountingSettings();
  const settings = settingsQuery.data;

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    values: settings
      ? {
          gstin: String(settings.taxRegistration?.gstin ?? ""),
          pan: String(settings.taxRegistration?.pan ?? ""),
          stateCode: String(settings.taxRegistration?.stateCode ?? ""),
        }
      : undefined,
  });

  function handleSave(values: TaxFormValues) {
    updateSettings.mutate(
      {
        taxRegistration: {
          ...(settings?.taxRegistration ?? {}),
          gstin: values.gstin,
          pan: values.pan,
          stateCode: values.stateCode,
        },
      },
      {
        onSuccess: () => { toast.success("Tax registration saved"); onComplete(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tax Registration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input {...form.register("gstin")} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input {...form.register("pan")} placeholder="AAAAA0000A" />
            </div>
            <div className="space-y-1.5">
              <Label>State code</Label>
              <Input {...form.register("stateCode")} placeholder="22" />
            </div>
          </div>
          <div className="flex gap-2">
            <LoadingButton type="submit" size="sm" isPending={updateSettings.isPending} loadingText="Saving…">
              Save & continue
            </LoadingButton>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
