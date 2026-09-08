"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAccountingSettings,
  useUpdateAccountingSettings,
} from "@/hooks/api/accounting/fin-settings";
import { useCoaTemplates, useApplyTemplate } from "@/hooks/api/accounting/core";
import {
  isAccountingBasis,
  readTaxRegistrationField,
  mergeTaxRegistration,
} from "@/features/accounting/settings/accounting-settings-schema";
import type { CoaTemplate } from "@/hooks/api/accounting/core";
import {
  companySchema,
  taxSchema,
  type CompanyFormValues,
  type TaxFormValues,
} from "./setup-wizard-schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface StepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ACCOUNTING_BASIS_VALUES = ["ACCRUAL", "CASH"] as const;

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
          accountingBasis: isAccountingBasis(settings.accountingBasis) ? settings.accountingBasis : "ACCRUAL",
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

  function handleAccountingBasisChange(v: string): void {
    const basis = ACCOUNTING_BASIS_VALUES.find((candidate) => candidate === v);
    if (basis) form.setValue("accountingBasis", basis, { shouldValidate: true });
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
                onValueChange={handleAccountingBasisChange}
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
          gstin: readTaxRegistrationField(settings.taxRegistration, "gstin"),
          pan: readTaxRegistrationField(settings.taxRegistration, "pan"),
          stateCode: readTaxRegistrationField(settings.taxRegistration, "stateCode"),
        }
      : undefined,
  });

  function handleSave(values: TaxFormValues) {
    updateSettings.mutate(
      {
        taxRegistration: mergeTaxRegistration(settings?.taxRegistration, {
          gstin: values.gstin,
          pan: values.pan,
          stateCode: values.stateCode,
        }),
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

export function StepChartOfAccounts({ onComplete, onSkip }: StepProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const templatesQuery = useCoaTemplates();
  const applyTemplate = useApplyTemplate();
  const templates = templatesQuery.data?.items ?? [];

  function handleSelectChange(value: string): void {
    setSelectedKey(value);
  }

  function handleApply(): void {
    if (!selectedKey) return;
    applyTemplate.mutate(
      { templateKey: selectedKey },
      {
        onSuccess: (result) => {
          toast.success(`Template applied: ${result.inserted} accounts added`);
          setAppliedCount(result.inserted);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Chart of Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templatesQuery.isError && (
          <p className="text-xs text-destructive" role="alert">
            Couldn&apos;t load chart-of-accounts templates: {getErrorMessage(templatesQuery.error)}
          </p>
        )}
        {!templatesQuery.isLoading && !templatesQuery.isError && templates.length === 0 ? (
          <EmptyState
            compact
            title="No chart-of-accounts templates"
            description="Nothing to apply here — skip this step and add accounts manually."
          />
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t: CoaTemplate) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleSelectChange(t.key)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selectedKey === t.key
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.country} · {t.accountCount} accounts</p>
            </button>
          ))}
        </div>
        {appliedCount !== null && (
          <div className="flex items-center gap-2 text-sm text-status-success-ink bg-status-success-surface border border-status-success-rule rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {appliedCount} accounts created from template
          </div>
        )}
        <div className="flex gap-2">
          {appliedCount !== null ? (
            <Button size="sm" onClick={onComplete}>Continue</Button>
          ) : (
            <LoadingButton
              size="sm"
              isPending={applyTemplate.isPending}
              loadingText="Applying…"
              disabled={!selectedKey}
              onClick={handleApply}
            >
              Apply template & continue
            </LoadingButton>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}
