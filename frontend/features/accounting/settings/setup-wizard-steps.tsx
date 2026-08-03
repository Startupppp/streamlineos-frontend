"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useSystemAccounts,
} from "@/hooks/api/accounting/fin-settings";
import { useCoaTemplates, useApplyTemplate, useGeneratePeriods } from "@/hooks/api/accounting/core";
import { SystemAccountMapDialog } from "@/features/accounting/settings/fin-settings-dialogs";
import { PURPOSE_LABELS } from "@/features/accounting/settings/fin-settings-sections";
import type { SystemAccountMapping } from "@/types/accounting/fin-settings";
import type { CoaTemplate } from "@/hooks/api/accounting/core";

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

interface StepProps {
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
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2">
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

export function StepSystemAccounts({ onComplete, onSkip }: StepProps) {
  const [editMapping, setEditMapping] = useState<SystemAccountMapping | null>(null);
  const systemAccountsQuery = useSystemAccounts();
  const accounts = systemAccountsQuery.data?.items ?? [];

  function handleCloseMappingDialog(v: boolean): void {
    if (!v) setEditMapping(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">System Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y divide-border rounded-lg border overflow-hidden">
            {accounts.map((m) => (
              <div key={m.purpose} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{PURPOSE_LABELS[m.purpose]}</p>
                  {m.account ? (
                    <p className="text-xs text-muted-foreground font-mono">{m.account.code} — {m.account.name}</p>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] mt-0.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">Not mapped</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0 ml-2" onClick={() => setEditMapping(m)}>
                  Map
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onComplete}>Continue</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </CardContent>
      </Card>

      {editMapping && (
        <SystemAccountMapDialog
          mapping={editMapping}
          open={!!editMapping}
          onOpenChange={handleCloseMappingDialog}
        />
      )}
    </>
  );
}

export function StepPeriods({ onComplete, onSkip }: StepProps) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [result, setResult] = useState<{ created: number } | null>(null);
  const generatePeriods = useGeneratePeriods();

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setYear(e.target.value);
  }

  function handleGenerate(): void {
    const y = Number(year);
    if (!y || y < 2000 || y > 2100) return;
    generatePeriods.mutate(
      { year: y },
      {
        onSuccess: (res) => {
          toast.success(`${res.created} periods created`);
          setResult({ created: res.created });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Accounting Periods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Generate monthly accounting periods for a fiscal year. You can add more years later.
        </p>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Fiscal year</Label>
            <Input
              type="number"
              value={year}
              onChange={handleYearChange}
              className="w-28"
              min={2000}
              max={2100}
            />
          </div>
          <LoadingButton
            size="sm"
            isPending={generatePeriods.isPending}
            loadingText="Generating…"
            onClick={handleGenerate}
          >
            Generate periods
          </LoadingButton>
        </div>
        {result !== null && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {result.created} periods created for {year}
          </div>
        )}
        <div className="flex gap-2">
          {result !== null && <Button size="sm" onClick={onComplete}>Continue</Button>}
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepOpeningBalances({ onComplete, onSkip }: StepProps) {
  const [done, setDone] = useState(false);

  function handleMarkDone(): void {
    setDone(true);
    onComplete();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Opening Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Enter your opening balances to record the financial state at the start of your accounting period.
          This is done on the Opening Balances page.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/accounting/opening-balances" target="_blank" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Go to Opening Balances
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleMarkDone} disabled={done}>
            {done ? "Marked as done" : "Mark as done"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}
