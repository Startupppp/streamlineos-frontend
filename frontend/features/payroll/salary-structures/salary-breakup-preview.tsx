"use client";

import { useState } from "react";
import { PageState } from "@/components/shared/page-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format-utils";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { usePageState } from "@/hooks/api/use-page-state";
import { SALARY_PREVIEW_CTC, useSalaryPreview, type SalaryPreviewParams } from "@/hooks/api/payroll/salary-preview";
import type { SalaryPreview, SalaryPreviewLine } from "@/hooks/api/payroll/salary-preview-schema";
import { usePayrollComponents } from "@/hooks/api/payroll/components";
import type { SalaryComponent } from "@/types/payroll/setup";

interface SalaryBreakupPreviewProps extends SalaryPreviewParams {
  className?: string;
}

const DEDUCTION_CATEGORIES = new Set<SalaryPreviewLine["category"]>(["DEDUCTION", "TAX", "ADJUSTMENT"]);

function LineGroup({ title, lines }: { title: string; lines: SalaryPreviewLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {lines.map((line) => (
        <div key={line.code} className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {line.name}
            {line.category === "EARNING" && !line.taxable ? " · exempt" : ""}
          </span>
          <span className="text-xs tabular-nums text-foreground">{formatINR(line.monthly)}</span>
        </div>
      ))}
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs tabular-nums", strong ? "font-bold text-foreground" : "text-foreground")}>
        {formatINR(value)}
      </span>
    </div>
  );
}

function BreakupBody({ data }: { data: SalaryPreview }) {
  const earnings = data.lines.filter((l) => l.category === "EARNING" || l.category === "REIMBURSEMENT");
  const deductions = data.lines.filter((l) => DEDUCTION_CATEGORIES.has(l.category));
  const employer = data.lines.filter((l) => l.category === "EMPLOYER_CONTRIBUTION");
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <TotalRow label="Earnings / month" value={data.monthly.gross} />
        <TotalRow label="Deductions / month" value={data.monthly.deductions} />
        <TotalRow label="Employer cost / month" value={data.monthly.employerContributions} />
        <TotalRow label="Net take-home / month" value={data.monthly.net} strong />
        <TotalRow label="Net take-home / year" value={data.annual.net} />
      </div>
      <LineGroup title="Earnings" lines={earnings} />
      <LineGroup title="Deductions" lines={deductions} />
      <LineGroup title="Employer contributions" lines={employer} />
      {data.warnings.map((warning) => (
        <p key={warning} className="text-xs text-destructive">{warning}</p>
      ))}
      <p className="text-micro text-muted-foreground">
        Computed by the payroll engine for a full-attendance month, {data.regime === "OLD" ? "old" : "new"} regime TDS
        estimate with no declarations{data.stateCode ? `, PT for ${data.stateCode}` : ""}.
      </p>
    </div>
  );
}

function BreakupSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export function SalaryBreakupPreview({ annualCtc, regime, workerType, className }: SalaryBreakupPreviewProps) {
  const debouncedCtc = useDebouncedValue(annualCtc.trim(), 400);
  const validCtc = SALARY_PREVIEW_CTC.test(debouncedCtc) && Number(debouncedCtc) > 0;
  const { data, isLoading, isError, error, refetch } = useSalaryPreview({ annualCtc: debouncedCtc, regime, workerType });
  const resolution = usePageState({ permission: "payroll:salaries:view", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }

  return (
    <div className={cn("rounded-xl border border-border bg-primary/5 px-4 py-3", className)}>
      {validCtc ? (
        <PageState resolution={resolution} loading={<BreakupSkeleton />} onRetry={handleRetry} compact>
          {data ? <BreakupBody data={data} /> : <BreakupSkeleton />}
        </PageState>
      ) : (
        <p className="text-xs text-muted-foreground">Enter an annual CTC to see the monthly breakup.</p>
      )}
    </div>
  );
}

export function SampleCtcPreview({ initialCtc = "1200000" }: { initialCtc?: string }) {
  const [sampleCtc, setSampleCtc] = useState(initialCtc);

  function handleSampleCtcChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSampleCtc(event.target.value);
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="sample-ctc" className="text-xs font-medium">Sample CTC (annual, ₹)</Label>
        <Input
          id="sample-ctc"
          inputMode="decimal"
          value={sampleCtc}
          onChange={handleSampleCtcChange}
          placeholder="e.g. 1200000"
        />
      </div>
      <SalaryBreakupPreview annualCtc={sampleCtc} />
    </div>
  );
}

function describeCalc(component: SalaryComponent): string {
  const percent = component.percent ? `${Number(component.percent)}%` : "";
  switch (component.calcMethod) {
    case "FIXED":
      return component.amount ? `fixed ${formatMoney(component.amount)}` : "fixed";
    case "PERCENT_OF_BASIC":
      return `${percent} of Basic`;
    case "PERCENT_OF_GROSS":
      return `${percent} of Gross`;
    case "FORMULA":
      return component.formula ?? "formula";
    case "ATTENDANCE_BASED":
      return "attendance based";
    case "TIMESHEET_BASED":
      return "timesheet based";
    case "MANUAL":
      return "entered per run";
  }
}

export function ComponentsUsed() {
  const { data, isLoading, isError, error, refetch } = usePayrollComponents({ active: true, limit: 100 });
  const resolution = usePageState({
    permission: "payroll:components:view",
    isLoading,
    isError,
    error,
    isEmpty: data?.items.length === 0,
  });

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="space-y-1.5">
      <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">Components used</p>
      <p className="text-micro text-muted-foreground">
        Payroll runs pay from the active component catalog below; the fixed fields on this template are reference values.
      </p>
      <PageState
        resolution={resolution}
        loading={<BreakupSkeleton />}
        empty={<p className="text-xs text-muted-foreground">No active components yet. Add them in the component catalog.</p>}
        onRetry={handleRetry}
        compact
      >
        <ul className="space-y-1">
          {data?.items.map((component) => (
            <li key={component.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground">
                {component.name} <span className="font-mono text-muted-foreground">{component.code}</span>
              </span>
              <span className="text-muted-foreground">{describeCalc(component)}</span>
            </li>
          ))}
        </ul>
        {data?.pagination.hasMore ? (
          <p className="text-micro text-muted-foreground">Showing the first 100 components.</p>
        ) : null}
      </PageState>
    </div>
  );
}
