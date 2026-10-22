"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { TabsNavigation, TabsNavigationLink } from "@/components/ui/tabs";
import { useModuleEnabled } from "@/hooks/api/access";
import { useEssFnf, useEssOverview } from "@/hooks/api/payroll/ess";
import { useT } from "@/lib/i18n/i18n";
import { getPaySectionIds, type PaySectionId } from "./pay-section-ids";

export function MoneyHubTabs() {
  const selectedTabRef = useRef<HTMLAnchorElement>(null);
  const t = useT();
  const params = useSearchParams();
  const payrollEnabled = useModuleEnabled("payroll");
  const hrEnabled = useModuleEnabled("hr");
  const { data: overview } = useEssOverview();
  const { data: fnf, isError: fnfFailed } = useEssFnf();
  const toggles = overview?.toggles;
  const paySections = getPaySectionIds({
    showSalary: toggles?.essShowSalaryStructure,
    allowReimbursements: toggles?.essAllowReimbursements,
    allowTax: toggles?.essAllowTaxDeclarations,
    showLoans:
      toggles?.essAllowLoanRequests ||
      parseFloat(overview?.activeLoanBalance ?? "0") > 0,
    allowBank: toggles?.essAllowBankUpdate,
    showFnf: Boolean(fnf || fnfFailed),
  });
  const labels: Record<PaySectionId, string> = {
    payslips: t("pay.tabPayslips"),
    "total-rewards": t("pay.tabTotalRewards"),
    disciplinary: t("pay.tabNotices"),
    form16: "Form 16",
    salary: t("pay.tabSalary"),
    reimbursements: t("pay.tabReimbursements"),
    tax: t("pay.tabTax"),
    loans: t("pay.tabLoans"),
    bank: t("pay.tabBank"),
    fnf: t("pay.tabFnf"),
  };
  const requested = params.get("tab");
  const activePayTab = paySections.find((id) => id === requested) ?? "payslips";
  const active =
    (params.get("section") === "pay" || !hrEnabled) && payrollEnabled
      ? activePayTab
      : "expenses";
  useEffect(() => {
    selectedTabRef.current?.scrollIntoView({
      block: "nearest",
      inline: "start",
    });
  }, [active]);

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    window.history.pushState(null, "", event.currentTarget.href);
  }

  return (
    <TabsNavigation
      aria-label="Expenses and pay sections"
      className="w-fit max-w-full shrink-0"
    >
      {hrEnabled && (
        <TabsNavigationLink active={active === "expenses"}>
          <a
            href="/me/money"
            onClick={handleNavigate}
            ref={active === "expenses" ? selectedTabRef : undefined}
          >
            Claims
          </a>
        </TabsNavigationLink>
      )}
      {payrollEnabled &&
        paySections.map((id) => (
          <TabsNavigationLink key={id} active={active === id}>
            <a
              href={`/me/money?section=pay&tab=${id}`}
              onClick={handleNavigate}
              ref={active === id ? selectedTabRef : undefined}
            >
              {labels[id]}
            </a>
          </TabsNavigationLink>
        ))}
    </TabsNavigation>
  );
}
