"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useAccountingSettings,
  useUpdateAccountingSettings,
  useNumberSequences,
  useSystemAccounts,
} from "@/hooks/api/accounting/fin-settings";
import {
  useApprovalPolicies,
  useExchangeRates,
} from "@/hooks/api/accounting/settings";
import {
  SequencesSection,
  SystemAccountsSection,
  PoliciesSection,
  ExchangeRatesSection,
  PaymentTermsSection,
  QuickLinks,
} from "@/features/accounting/settings/fin-settings-sections";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const companySchema = z.object({
  baseCurrency: z.string().min(1),
  fiscalYearStartMonth: z.string().min(1),
  accountingBasis: z.enum(["ACCRUAL", "CASH"]),
});
type CompanyFormValues = z.infer<typeof companySchema>;

const taxSchema = z.object({
  gstin: z.string(),
  pan: z.string(),
  stateCode: z.string(),
});
type TaxFormValues = z.infer<typeof taxSchema>;

export default function FinanceSettingsPage() {
  const canManage = useCan("accounting:settings:manage");

  const settingsQuery = useAccountingSettings();
  const sequencesQuery = useNumberSequences();
  const systemAccountsQuery = useSystemAccounts();
  const policiesQuery = useApprovalPolicies();
  const ratesQuery = useExchangeRates();

  const updateSettings = useUpdateAccountingSettings();

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    values: settingsQuery.data
      ? {
          baseCurrency: settingsQuery.data.baseCurrency,
          fiscalYearStartMonth: String(settingsQuery.data.fiscalYearStartMonth),
          accountingBasis: settingsQuery.data.accountingBasis,
        }
      : undefined,
  });

  const taxForm = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    values: settingsQuery.data
      ? {
          gstin: String(settingsQuery.data.taxRegistration?.gstin ?? ""),
          pan: String(settingsQuery.data.taxRegistration?.pan ?? ""),
          stateCode: String(settingsQuery.data.taxRegistration?.stateCode ?? ""),
        }
      : undefined,
  });

  function handleSaveCompany(values: CompanyFormValues) {
    updateSettings.mutate(
      {
        baseCurrency: values.baseCurrency,
        fiscalYearStartMonth: Number(values.fiscalYearStartMonth),
        accountingBasis: values.accountingBasis,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleSaveTax(values: TaxFormValues) {
    updateSettings.mutate(
      {
        taxRegistration: {
          ...(settingsQuery.data?.taxRegistration ?? {}),
          gstin: values.gstin,
          pan: values.pan,
          stateCode: values.stateCode,
        },
      },
      {
        onSuccess: () => toast.success("Tax registration saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleRetrySettings(): void {
    void settingsQuery.refetch();
  }

  if (settingsQuery.isLoading) return <div className="flex flex-1 min-h-0 flex-col"><LoadingState /></div>;
  if (settingsQuery.error)
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <ErrorState
          title="Failed to load settings"
          description={getErrorMessage(settingsQuery.error)}
          onRetry={handleRetrySettings}
        />
      </div>
    );

  const sequences = sequencesQuery.data?.items ?? [];
  const systemAccounts = systemAccountsQuery.data?.items ?? [];
  const policies = policiesQuery.data?.items ?? [];
  const rates = ratesQuery.data?.items ?? [];
  const paymentTerms = settingsQuery.data?.paymentTerms ?? [];

  return (
    <PageWrapper title="Finance Settings" subtitle="Company financial configuration">
      <div className="flex flex-1 min-h-0 flex-col gap-6 pb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Company Financial</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={companyForm.handleSubmit(handleSaveCompany)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Base currency</Label>
                  <Input
                    {...companyForm.register("baseCurrency")}
                    disabled={!canManage}
                    className="text-xs uppercase"
                    placeholder="INR"
                  />
                  {companyForm.formState.errors.baseCurrency && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.baseCurrency.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Fiscal year start month</Label>
                  <Select
                    value={companyForm.watch("fiscalYearStartMonth")}
                    onValueChange={(v) => companyForm.setValue("fiscalYearStartMonth", v, { shouldValidate: true })}
                    disabled={!canManage}
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
                    value={companyForm.watch("accountingBasis")}
                    onValueChange={(v) =>
                      companyForm.setValue("accountingBasis", v as "ACCRUAL" | "CASH", { shouldValidate: true })
                    }
                    disabled={!canManage}
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
              {canManage && (
                <LoadingButton type="submit" size="sm" isPending={updateSettings.isPending} loadingText="Saving…">
                  Save
                </LoadingButton>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tax Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={taxForm.handleSubmit(handleSaveTax)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>GSTIN</Label>
                  <Input {...taxForm.register("gstin")} disabled={!canManage} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN</Label>
                  <Input {...taxForm.register("pan")} disabled={!canManage} placeholder="AAAAA0000A" />
                </div>
                <div className="space-y-1.5">
                  <Label>State code</Label>
                  <Input {...taxForm.register("stateCode")} disabled={!canManage} placeholder="22" />
                </div>
              </div>
              {canManage && (
                <LoadingButton type="submit" size="sm" isPending={updateSettings.isPending} loadingText="Saving…">
                  Save
                </LoadingButton>
              )}
            </form>
          </CardContent>
        </Card>

        <SequencesSection sequences={sequences} canManage={canManage} />
        <SystemAccountsSection systemAccounts={systemAccounts} canManage={canManage} />
        <PoliciesSection policies={policies} canManage={canManage} />
        <ExchangeRatesSection rates={rates} canManage={canManage} />
        <PaymentTermsSection terms={paymentTerms} canManage={canManage} />
        <QuickLinks />
      </div>
    </PageWrapper>
  );
}
