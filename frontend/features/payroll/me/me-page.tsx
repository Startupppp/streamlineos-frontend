"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Coins,
  Receipt,
  Info,
  AlertTriangle,
  Users,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  useEssOverview,
  useEssFnf,
  useManagerInbox,
} from "@/hooks/api/payroll/ess";
import {
  formatMoney,
  formatMonth,
} from "@/features/payroll/shared/payroll-format";
import {
  EssSectionNav,
  EssPayslipsSection,
  EssSalarySection,
  EssReimbursementsSection,
  EssTaxSection,
  EssLoansSection,
  EssBankSection,
  EssFnfSection,
  EssTotalRewardsSection,
  EssDisciplinarySection,
} from "@/features/payroll/ess";
import type { EssSectionNavItem } from "@/features/payroll/ess/components/ess-section-nav";
import { useModuleEnabled } from "@/hooks/api/access";

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function MyPayrollPageContent() {
  const payrollModuleEnabled = useModuleEnabled("payroll");
  const { data: overview, isLoading: overviewLoading } = useEssOverview();
  const { data: fnf } = useEssFnf();
  const { data: managerInbox } = useManagerInbox(payrollModuleEnabled);

  const toggles = overview?.toggles;
  const actionRequired = overview?.actionRequired ?? [];
  const hasTeam = (managerInbox?.reportCount ?? 0) > 0;

  const sections = useMemo<EssSectionNavItem[]>(() => {
    const items: EssSectionNavItem[] = [
      { id: "payslips", label: "Payslips" },
      { id: "total-rewards", label: "Total Rewards" },
      { id: "disciplinary", label: "Notices" },
    ];
    if (toggles?.essShowSalaryStructure)
      items.push({ id: "salary", label: "Salary Structure" });
    if (toggles?.essAllowReimbursements)
      items.push({ id: "reimbursements", label: "Reimbursements" });
    if (toggles?.essAllowTaxDeclarations)
      items.push({ id: "tax", label: "Tax Declaration" });
    if (
      toggles?.essAllowLoanRequests ||
      parseFloat(overview?.activeLoanBalance ?? "0") > 0
    ) {
      items.push({ id: "loans", label: "Loans" });
    }
    if (toggles?.essAllowBankUpdate)
      items.push({ id: "bank", label: "Bank Details" });
    if (fnf) items.push({ id: "fnf", label: "FNF Settlement" });
    return items;
  }, [toggles, overview?.activeLoanBalance, fnf]);

  const showLoans =
    toggles?.essAllowLoanRequests ||
    (overview?.activeLoanBalance !== undefined &&
      parseFloat(overview.activeLoanBalance) > 0);

  const activeLoanBalance = overview?.activeLoanBalance
    ? parseFloat(overview.activeLoanBalance)
    : 0;

  return (
    <PageWrapper title="My Payroll" subtitle={getCurrentMonthLabel()}>
      <div className="space-y-4">
        {overview?.capabilities?.honestyNote && (
          <div
            role="status"
            className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              {overview.capabilities.honestyNote}
            </p>
          </div>
        )}

        {actionRequired.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10 space-y-1.5">
            <p className="text-[12px] font-medium text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Action required
            </p>
            <ul className="space-y-1">
              {actionRequired.map((a) => (
                <li key={a.key}>
                  <Link
                    href={a.href}
                    className="text-[11px] text-amber-800 underline underline-offset-2 dark:text-amber-200 hover:opacity-80"
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasTeam && (
          <Link
            href="/payroll/team"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/40 transition-colors"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground">
                Team payroll inbox
              </p>
              <p className="text-[11px] text-muted-foreground">
                {managerInbox?.totals.membersNeedingAction ?? 0} of{" "}
                {managerInbox?.reportCount ?? 0} direct report(s) need attention
              </p>
            </div>
            <span className="text-[11px] text-primary font-medium">Open</span>
          </Link>
        )}

        <StatCardGrid cols={activeLoanBalance > 0 ? 4 : 3}>
          <StatCard
            label="Net Pay Last Month"
            value={
              overviewLoading
                ? "—"
                : formatMoney(overview?.latestPayslip?.net ?? null)
            }
            icon={Wallet}
            tone="blue"
            isLoading={overviewLoading}
            hint={
              overview?.latestPayslip
                ? formatMonth(overview.latestPayslip.month)
                : undefined
            }
          />
          <StatCard
            label="YTD Earnings"
            value={
              overviewLoading ? "—" : formatMoney(overview?.ytd?.gross ?? null)
            }
            icon={TrendingUp}
            tone="emerald"
            isLoading={overviewLoading}
            hint="Financial year to date"
          />
          {activeLoanBalance > 0 && (
            <StatCard
              label="Active Loan Balance"
              value={
                overviewLoading
                  ? "—"
                  : formatMoney(overview?.activeLoanBalance ?? null)
              }
              icon={Coins}
              tone="amber"
              isLoading={overviewLoading}
            />
          )}
          <StatCard
            label="Pending Claims"
            value={
              overviewLoading
                ? "—"
                : String(overview?.pendingReimbursementsCount ?? 0)
            }
            icon={Receipt}
            tone="default"
            isLoading={overviewLoading}
            hint="Awaiting approval"
          />
        </StatCardGrid>

        <EssSectionNav items={sections} />

        <div className="space-y-4">
          <EssPayslipsSection />

          <EssTotalRewardsSection />

          <EssDisciplinarySection />

          {toggles?.essShowSalaryStructure && <EssSalarySection />}

          {toggles?.essAllowReimbursements && <EssReimbursementsSection />}

          {toggles?.essAllowTaxDeclarations && <EssTaxSection />}

          {showLoans && (
            <EssLoansSection
              allowRequests={toggles?.essAllowLoanRequests ?? false}
            />
          )}

          {toggles?.essAllowBankUpdate && <EssBankSection />}

          {fnf && <EssFnfSection />}
        </div>
      </div>
    </PageWrapper>
  );
}
