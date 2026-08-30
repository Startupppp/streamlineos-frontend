"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Coins,
  Receipt,
  AlertTriangle,
  Users,
  FilePen,
} from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PlusIcon, DownloadIcon, WalletIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  useEssOverview,
  useEssFnf,
  useEssPayslips,
  useEssTaxDeclaration,
  useManagerInbox,
} from "@/hooks/api/payroll/ess";
import { downloadFnfStatement } from "@/hooks/api/payroll/fnf";
import {
  formatMoney,
  formatMonth,
} from "@/features/payroll/shared/payroll-format";
import {
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
import { cn } from "@/lib/utils";
import { useModuleEnabled } from "@/hooks/api/access";
import type { EssSectionNavItem } from "@/features/payroll/ess/components/ess-section-nav";

const TAB_PANEL_CLASS = cn(
  TABS_CONTENT_PAGE_BODY_CLASS,
  "mt-0 h-full min-h-0 w-full flex-1",
);

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYear(month: string): string {
  return month.split("-")[0] ?? "";
}

export function MyPayrollPageContent() {
  const payrollModuleEnabled = useModuleEnabled("payroll");
  const { data: fnf } = useEssFnf();
  const { data: payslips } = useEssPayslips();
  const { data: managerInbox } = useManagerInbox(payrollModuleEnabled);
  const { data: overview, isLoading: overviewLoading } = useEssOverview();

  const [activeTab, setActiveTab] = useState("payslips");
  const [yearFilter, setYearFilter] = useState("all");
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [reimbSheetOpen, setReimbSheetOpen] = useState(false);
  const [taxSheetOpen, setTaxSheetOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [fnfDownloading, setFnfDownloading] = useState(false);

  const toggles = overview?.toggles;
  const { data: taxData } = useEssTaxDeclaration({
    enabled: !!toggles?.essAllowTaxDeclarations,
  });

  const actionRequired = useMemo(
    () =>
      (overview?.actionRequired ?? []).filter(
        (item) => item.severity === "warning",
      ),
    [overview?.actionRequired],
  );
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

  const years = useMemo(
    () =>
      payslips
        ? [...new Set(payslips.map((p) => getYear(p.month)))]
            .filter(Boolean)
            .sort((a, b) => Number(b) - Number(a))
        : [],
    [payslips],
  );

  const taxWindowOpen = taxData?.windowStatus === "OPEN";

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleOpenBankSheet = useCallback(() => {
    setBankSheetOpen(true);
  }, []);

  const handleOpenReimbSheet = useCallback(() => {
    setReimbSheetOpen(true);
  }, []);

  const handleOpenTaxSheet = useCallback(() => {
    setTaxSheetOpen(true);
  }, []);

  const handleOpenLoanDialog = useCallback(() => {
    setLoanDialogOpen(true);
  }, []);

  const handleDownloadFnf = useCallback(async () => {
    if (!fnf || fnfDownloading) return;
    setFnfDownloading(true);
    try {
      await downloadFnfStatement(fnf.id);
      toast.success("Statement downloaded");
    } catch {
      toast.error("Failed to download statement");
    } finally {
      setFnfDownloading(false);
    }
  }, [fnf, fnfDownloading]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <PageWrapper
        title="Pay"
        subtitle={`${formatMonth(currentYearMonth())} · Your payroll data only`}
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        filtersClassName="flex-col items-stretch gap-3 overflow-visible pb-3 [&>*]:w-full"
        filters={
          <>
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
                  overviewLoading
                    ? "—"
                    : formatMoney(overview?.ytd?.gross ?? null)
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

            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
              <TabsList className="w-full shrink-0 md:w-auto">
                {sections.map((section) => (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="gap-1.5 truncate"
                  >
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {activeTab === "payslips" && years.length > 0 ? (
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger
                      className={`${FILTER_SELECT_TRIGGER} w-28`}
                    >
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="all">All years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {activeTab === "reimbursements" ? (
                  <AnimatedIconButton
                    icon={PlusIcon}
                    iconClassName="mr-1.5"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleOpenReimbSheet}
                  >
                    Submit Claim
                  </AnimatedIconButton>
                ) : null}

                {activeTab === "tax" && taxWindowOpen ? (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleOpenTaxSheet}
                  >
                    <FilePen className="h-3.5 w-3.5" />
                    {taxData?.declaration ? "Edit" : "Submit"} Declaration
                  </Button>
                ) : null}

                {activeTab === "loans" && toggles?.essAllowLoanRequests ? (
                  <AnimatedIconButton
                    icon={PlusIcon}
                    iconClassName="mr-1.5"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleOpenLoanDialog}
                  >
                    Request Loan
                  </AnimatedIconButton>
                ) : null}

                {activeTab === "bank" ? (
                  <AnimatedIconButton
                    icon={WalletIcon}
                    iconClassName="mr-1.5"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleOpenBankSheet}
                  >
                    Update
                  </AnimatedIconButton>
                ) : null}

                {activeTab === "fnf" && fnf?.statementPublishedAt ? (
                  <AnimatedIconButton
                    icon={DownloadIcon}
                    iconClassName="mr-1.5"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleDownloadFnf}
                    disabled={fnfDownloading}
                  >
                    {fnfDownloading ? "Downloading…" : "Download statement"}
                  </AnimatedIconButton>
                ) : null}
              </div>
            </div>
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {(actionRequired.length > 0 || hasTeam) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actionRequired.map((a) => (
                <Link
                  key={a.key}
                  href={a.href}
                  className="inline-flex items-center gap-1.5 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-1 text-dense font-medium text-status-warning-ink transition-colors hover:bg-status-warning-surface"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {a.label}
                </Link>
              ))}

              {hasTeam ? (
                <Link
                  href="/payroll/team"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-dense font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                  Team inbox · {managerInbox?.totals.membersNeedingAction ?? 0}/
                  {managerInbox?.reportCount ?? 0}
                </Link>
              ) : null}
            </div>
          )}

          <TabsContent value="payslips" className={TAB_PANEL_CLASS}>
            <EssPayslipsSection
              yearFilter={yearFilter}
              onYearFilterChange={setYearFilter}
              hideYearFilter
            />
          </TabsContent>

          <TabsContent value="total-rewards" className={TAB_PANEL_CLASS}>
            <EssTotalRewardsSection />
          </TabsContent>
          <TabsContent value="disciplinary" className={TAB_PANEL_CLASS}>
            <EssDisciplinarySection />
          </TabsContent>
          {toggles?.essShowSalaryStructure && (
            <TabsContent value="salary" className={TAB_PANEL_CLASS}>
              <EssSalarySection />
            </TabsContent>
          )}
          {toggles?.essAllowReimbursements && (
            <TabsContent value="reimbursements" className={TAB_PANEL_CLASS}>
              <EssReimbursementsSection
                hideToolbar
                sheetOpen={reimbSheetOpen}
                onSheetOpenChange={setReimbSheetOpen}
              />
            </TabsContent>
          )}
          {toggles?.essAllowTaxDeclarations && (
            <TabsContent value="tax" className={TAB_PANEL_CLASS}>
              <EssTaxSection
                hideToolbar
                sheetOpen={taxSheetOpen}
                onSheetOpenChange={setTaxSheetOpen}
              />
            </TabsContent>
          )}
          {showLoans && (
            <TabsContent value="loans" className={TAB_PANEL_CLASS}>
              <EssLoansSection
                allowRequests={toggles?.essAllowLoanRequests ?? false}
                hideToolbar
                dialogOpen={loanDialogOpen}
                onDialogOpenChange={setLoanDialogOpen}
              />
            </TabsContent>
          )}
          {toggles?.essAllowBankUpdate && (
            <TabsContent value="bank" className={TAB_PANEL_CLASS}>
              <EssBankSection
                hideToolbar
                sheetOpen={bankSheetOpen}
                onSheetOpenChange={setBankSheetOpen}
              />
            </TabsContent>
          )}
          {fnf && (
            <TabsContent value="fnf" className={TAB_PANEL_CLASS}>
              <EssFnfSection hideToolbar />
            </TabsContent>
          )}
        </div>
      </PageWrapper>
    </Tabs>
  );
}
