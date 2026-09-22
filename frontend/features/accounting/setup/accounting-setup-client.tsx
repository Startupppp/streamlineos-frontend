"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, CircleDashed, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState, PageState } from "@/components/shared";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { accountingLedgerQueryKeys } from "@/lib/query-keys/accounting-ledger";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingSetupStatus, useTaxRegistrations } from "@/hooks/api/accounting/ledger";
import { useAddTaxRegistration } from "@/hooks/api/accounting/ledger-mutations";
import { EnableAccountingCard } from "./enable-accounting-card";
import { ProvisioningNotice } from "./provisioning-notice";
import { taxRegistrationSchema, type TaxRegistrationFormValues } from "./enable-accounting-schema";

const TAX_REGIMES: ReadonlyArray<{ value: TaxRegistrationFormValues["regime"]; label: string }> = [
  { value: "GST_IN", label: "India GST (GSTIN)" },
  { value: "VAT_EU", label: "EU VAT" },
  { value: "VAT_GB", label: "UK VAT" },
  { value: "VAT_GCC", label: "GCC VAT" },
  { value: "GST_SG", label: "Singapore GST" },
  { value: "GST_AU", label: "Australia GST" },
  { value: "GST_HST_CA", label: "Canada GST/HST" },
  { value: "SALES_TAX_US", label: "US sales tax" },
  { value: "PAN_IN", label: "India PAN" },
  { value: "TAN_IN", label: "India TAN" },
  { value: "EIN_US", label: "US EIN" },
  { value: "GENERIC", label: "Other" },
];

function TaxRegistrationCard() {
  const registrationsQuery = useTaxRegistrations();
  const addRegistration = useAddTaxRegistration();

  const form = useForm<TaxRegistrationFormValues>({
    resolver: zodResolver(taxRegistrationSchema),
    defaultValues: { regime: "GST_IN", number: "", countryCode: "IN" },
  });

  function handleSubmit(values: TaxRegistrationFormValues): void {
    addRegistration.mutate(taxRegistrationSchema.parse(values), {
      onSuccess: () => {
        toast.success("Tax registration saved");
        form.reset({ regime: values.regime, number: "", countryCode: values.countryCode });
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const registrations = registrationsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Tax registration</CardTitle>
        </div>
        <CardDescription>
          Invoices cannot show the right tax until your registration number is on file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {registrations.length > 0 ? (
          <ul className="space-y-2">
            {registrations.map((registration) => (
              <li
                key={registration.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{registration.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {registration.regime}
                    {registration.region ? ` · region ${registration.region}` : ""}
                  </p>
                </div>
                {registration.isPrimary ? (
                  <Badge variant="outline" className="h-5 px-2 py-0.5 text-xs">
                    Primary
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            className="min-h-[16vh] border-0 bg-transparent"
            title="No registrations on file"
            description="Add the number below and invoices start showing the right tax."
          />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="regime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {TAX_REGIMES.map((regime) => (
                          <SelectItem key={regime.value} value={regime.value}>
                            {regime.label}
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
                      <Input {...field} maxLength={2} placeholder="IN" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="29AABCU9603R1ZM" />
                  </FormControl>
                  <FormDescription>
                    For an Indian GSTIN we read the state from the first two digits, so place of
                    supply works straight away.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton type="submit" isPending={addRegistration.isPending} variant="outline">
              Save registration
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AccountingSetupClient() {
  const canManage = useCan("accounting:settings:manage");
  const queryClient = useQueryClient();
  const statusQuery = useAccountingSetupStatus();

  const pageState = usePageState({
    permission: "accounting:settings:read",
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
  });

  function handleEnabled(): void {
    void queryClient.invalidateQueries({ queryKey: accountingLedgerQueryKeys.accountingLedger.all });
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Accounting setup">
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (statusQuery.isPending) {
    return (
      <PageWrapper title="Accounting setup" subtitle="Getting your books ready">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const status = statusQuery.data;

  if (!status || !status.enabled) {
    return (
      <PageWrapper
        title="Accounting setup"
        subtitle="Books, chart of accounts and tax rates in one step"
      >
        <div className="space-y-4">
          {/*
            An org with the module on and no book is not the same as an org
            that never asked for accounting, and this screen used to render
            both identically — an invitation to set something up, with no hint
            that postings were already being accepted and recorded nowhere.
          */}
          {status ? <ProvisioningNotice provisioning={status.provisioning} /> : null}
          {canManage ? (
            <EnableAccountingCard onEnabled={handleEnabled} />
          ) : (
            <NoPermissionState permission="accounting:settings:manage" />
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Accounting setup"
      subtitle={`${status.book.name} · ${status.book.baseCurrency} · ${status.book.localizationPack}`}
      badge={status.packStatus === "stub" ? "Manual tax" : undefined}
      actions={
        <Button asChild variant="outline">
          <Link href="/accounting">Go to accounting</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <ProvisioningNotice provisioning={status.provisioning} />
        <StatCardGrid cols={3}>
          <StatCard label="Accounts" value={status.accounts} tone="blue" />
          <StatCard label="Tax codes" value={status.taxCodes} tone="violet" />
          <StatCard
            label="Registrations"
            value={status.taxRegistrations}
            tone={status.taxRegistrations > 0 ? "emerald" : "amber"}
          />
        </StatCardGrid>

        {status.nextSteps.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>What is left to do</CardTitle>
              <CardDescription>
                Your books already work. These finish the picture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {status.nextSteps.map((step) => (
                  <li key={step} className="flex items-start gap-2 text-sm">
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-2 p-4 text-sm">
              <CheckCircle2 className="h-4 w-4 text-status-success-ink" aria-hidden="true" />
              Setup is complete.
            </CardContent>
          </Card>
        )}

        {canManage ? <TaxRegistrationCard /> : null}
      </div>
    </PageWrapper>
  );
}
