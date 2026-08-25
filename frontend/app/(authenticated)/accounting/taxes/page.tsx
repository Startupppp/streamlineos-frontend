"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared";
import { Money } from "@/features/accounting/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import type { ChartDatum } from "@/features/accounting/taxes/tax-rate-chart";
import { useTaxDashboard } from "@/hooks/api/accounting/taxes";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { TaxPayment, TaxRateGroup, TaxType } from "@/types/accounting/taxes";

const TaxRateChart = dynamic(
  () => import("@/features/accounting/taxes/tax-rate-chart").then((m) => ({ default: m.TaxRateChart })),
  { ssr: false, loading: () => <Skeleton className="h-[248px] w-full rounded-xl" /> },
);

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function toChartData(groups: TaxRateGroup[]): ChartDatum[] {
  return groups.map((g) => ({
    rate: `${g.rate}%`,
    cgst: parseFloat(g.cgst),
    sgst: parseFloat(g.sgst),
    igst: parseFloat(g.igst),
  }));
}

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  GST: "GST",
  CGST_SGST: "CGST/SGST",
  IGST: "IGST",
  VAT: "VAT",
  TDS: "TDS",
  TCS: "TCS",
  EXEMPT: "Exempt",
  ZERO_RATED: "Zero Rated",
};

interface DueDateCardProps {
  label: string;
  dueDate: string;
  href: string;
}

function DueDateCard({ label, dueDate, href }: DueDateCardProps) {
  const days = daysUntil(dueDate);
  const isUrgent = days <= 5;
  return (
    <Link href={href} className="flex-1 min-w-0">
      <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-dense font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-foreground">{dueDate}</p>
          </div>
          {isUrgent && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-micro shrink-0 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
              {days <= 0 ? "Due today" : `${days}d left`}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface RecentPaymentRowProps {
  payment: TaxPayment;
}

function RecentPaymentRow({ payment }: RecentPaymentRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-micro shrink-0">
          {TAX_TYPE_LABELS[payment.taxType]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {payment.periodStart} – {payment.periodEnd}
        </span>
      </div>
      <div className="text-right">
        <Money value={parseFloat(payment.amount)} className="text-sm font-semibold" />
        <p className="text-micro text-muted-foreground">{payment.paidDate}</p>
      </div>
    </div>
  );
}

export default function TaxPage() {
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(today());
  const router = useRouter();

  const { data, isLoading, error, refetch } = useTaxDashboard(from, to);

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleNavigateCodes(): void {
    router.push("/accounting/taxes/codes");
  }

  function handleNavigatePayments(): void {
    router.push("/accounting/taxes/payments");
  }

  function handleNavigateReports(): void {
    router.push("/accounting/taxes/reports");
  }

  const outputChartData = toChartData(data?.outputTaxByRate ?? []);
  const inputChartData = toChartData(data?.inputTaxByRate ?? []);
  const recentPayments = (data?.recentPayments ?? []).slice(0, 5);

  return (
    <PageWrapper
      title="Tax"
      subtitle="GST compliance and tax liability overview"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="tax-from"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker
              id="tax-from"
              value={from}
              onChange={handleFromChange}
              placeholder="Pick a date"
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="tax-to"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker
              id="tax-to"
              value={to}
              onChange={handleToChange}
              placeholder="Pick a date"
              className="w-[160px]"
            />
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNavigateCodes}>
            Tax Codes
          </Button>
          <Button variant="outline" size="sm" onClick={handleNavigatePayments}>
            Payments
          </Button>
          <Button variant="default" size="sm" onClick={handleNavigateReports}>
            Reports
          </Button>
        </div>
      }
    >
      {error ? (
        <ErrorState
          title="Failed to load tax dashboard"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : isLoading ? (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGrid cols={4}>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </StatCardGrid>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[248px] rounded-xl" />
            <Skeleton className="h-[248px] rounded-xl" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="flex-1 h-16 rounded-xl" />
            <Skeleton className="flex-1 h-16 rounded-xl" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGrid cols={4}>
            <StatCard
              label="Net Liability"
              value={data ? formatCurrencyFull(parseFloat(data.summary.netLiability)) : "—"}
              tone="amber"
            />
            <StatCard
              label="Unpaid"
              value={data ? formatCurrencyFull(parseFloat(data.summary.unpaidLiability)) : "—"}
              tone="red"
            />
            <StatCard
              label="Output Tax"
              value={data ? formatCurrencyFull(parseFloat(data.summary.totalOutputTax)) : "—"}
              tone="blue"
            />
            <StatCard
              label="Input Credit"
              value={data ? formatCurrencyFull(parseFloat(data.summary.totalInputTax)) : "—"}
              tone="emerald"
            />
          </StatCardGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TaxRateChart title="Output Tax by Rate" data={outputChartData} />
            <TaxRateChart title="Input Tax by Rate" data={inputChartData} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <DueDateCard
              label="GSTR-1 Due"
              dueDate={data?.nextDue.gstr1 ?? "—"}
              href="/accounting/gstr-1"
            />
            <DueDateCard
              label="GSTR-3B Due"
              dueDate={data?.nextDue.gstr3b ?? "—"}
              href="/accounting/gstr-3b"
            />
          </div>

          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent payments</p>
              ) : (
                recentPayments.map((payment) => (
                  <RecentPaymentRow key={payment.id} payment={payment} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
