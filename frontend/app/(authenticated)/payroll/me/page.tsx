"use client";

import { useMemo } from "react";
import { Wallet, TrendingUp, Coins, Receipt } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useEssOverview, useEssFnf } from "@/hooks/api/payroll/ess";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import {
  EssSectionNav,
  EssPayslipsSection,
  EssSalarySection,
  EssReimbursementsSection,
  EssTaxSection,
  EssLoansSection,
  EssBankSection,
  EssFnfSection,
} from "@/features/payroll/ess";
import type { EssSectionNavItem } from "@/features/payroll/ess/components/ess-section-nav";

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function MyPayrollPage() {
  const { data: overview, isLoading: overviewLoading } = useEssOverview();
  const { data: fnf } = useEssFnf();

  const toggles = overview?.toggles;

  const sections = useMemo<EssSectionNavItem[]>(() => {
    const items: EssSectionNavItem[] = [{ id: "payslips", label: "Payslips" }];
    if (toggles?.essShowSalaryStructure) items.push({ id: "salary", label: "Salary Structure" });
    if (toggles?.essAllowReimbursements) items.push({ id: "reimbursements", label: "Reimbursements" });
    if (toggles?.essAllowTaxDeclarations) items.push({ id: "tax", label: "Tax Declaration" });
    if (toggles?.essAllowLoanRequests || parseFloat(overview?.activeLoanBalance ?? "0") > 0) {
      items.push({ id: "loans", label: "Loans" });
    }
    if (toggles?.essAllowBankUpdate) items.push({ id: "bank", label: "Bank Details" });
    if (fnf) items.push({ id: "fnf", label: "FNF Settlement" });
    return items;
  }, [toggles, overview?.activeLoanBalance, fnf]);

  const showLoans =
    toggles?.essAllowLoanRequests ||
    (overview?.activeLoanBalance !== undefined && parseFloat(overview.activeLoanBalance) > 0);

  const activeLoanBalance = overview?.activeLoanBalance ? parseFloat(overview.activeLoanBalance) : 0;

  return (
    <PageWrapper
      title="My Payroll"
      subtitle={getCurrentMonthLabel()}
    >
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="Net Pay Last Month"
            value={overviewLoading ? "—" : formatMoney(overview?.latestPayslip?.net ?? null)}
            icon={Wallet}
            tone="blue"
            isLoading={overviewLoading}
            hint={overview?.latestPayslip ? formatMonth(overview.latestPayslip.month) : undefined}
          />
          <StatCard
            label="YTD Earnings"
            value={overviewLoading ? "—" : formatMoney(overview?.ytd?.gross ?? null)}
            icon={TrendingUp}
            tone="emerald"
            isLoading={overviewLoading}
            hint="Financial year to date"
          />
          {activeLoanBalance > 0 && (
            <StatCard
              label="Active Loan Balance"
              value={overviewLoading ? "—" : formatMoney(overview?.activeLoanBalance ?? null)}
              icon={Coins}
              tone="amber"
              isLoading={overviewLoading}
            />
          )}
          <StatCard
            label="Pending Claims"
            value={overviewLoading ? "—" : String(overview?.pendingReimbursementsCount ?? 0)}
            icon={Receipt}
            tone="default"
            isLoading={overviewLoading}
            hint="Awaiting approval"
          />
        </StatCardGrid>

        <EssSectionNav items={sections} />

        <div className="space-y-4">
          <EssPayslipsSection />

          {toggles?.essShowSalaryStructure && <EssSalarySection />}

          {toggles?.essAllowReimbursements && <EssReimbursementsSection />}

          {toggles?.essAllowTaxDeclarations && <EssTaxSection />}

          {showLoans && <EssLoansSection allowRequests={toggles?.essAllowLoanRequests ?? false} />}

          {toggles?.essAllowBankUpdate && <EssBankSection />}

          {fnf && <EssFnfSection />}
        </div>
      </div>
    </PageWrapper>
  );
}
