import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MyPayrollPageContent } from "./me-page";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters }: { children: React.ReactNode; title: React.ReactNode; filters?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useModuleEnabled: () => true,
  useCan: () => true,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/payroll/fnf", () => ({
  downloadFnfStatement: jest.fn(),
}));

const TOGGLES = {
  essShowSalaryStructure: true,
  essAllowReimbursements: true,
  essAllowTaxDeclarations: true,
  essAllowLoanRequests: true,
  essAllowBankUpdate: true,
};

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssOverview: () => ({
    data: {
      toggles: TOGGLES,
      latestPayslip: { month: "2026-09", net: "51000" },
      ytd: { gross: "400000" },
      activeLoanBalance: "1200",
      pendingReimbursementsCount: 2,
      actionRequired: [],
    },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  }),
  useEssFnf: () => ({ data: { id: 3, statementPublishedAt: null }, isError: false }),
  useEssPayslips: () => ({ data: [{ publicationId: 1, month: "2026-09", net: "51000", publishedAt: "2026-10-01", downloadHref: "/x" }] }),
  useEssTaxDeclaration: () => ({ data: { windowStatus: "CLOSED", declaration: null } }),
  useEssBank: () => ({ data: { hasBank: false, masked: null } }),
  useManagerInbox: () => ({ data: { reportCount: 0, totals: { membersNeedingAction: 0 } } }),
}));

function section(label: string) {
  return function Section() {
    return <div>{label} panel</div>;
  };
}

jest.mock("@/features/payroll/ess", () => ({
  EssPayslipsSection: section("Payslips"),
  EssSalarySection: section("Salary Structure"),
  EssReimbursementsSection: section("Reimbursements"),
  EssTaxSection: section("Tax Declaration"),
  EssLoansSection: section("Loans"),
  EssBankSection: section("Bank Details"),
  EssFnfSection: section("Final settlement"),
  EssTotalRewardsSection: section("Total Rewards"),
  EssDisciplinarySection: section("Notices"),
}));

const EXPECTED_TABS = [
  "Payslips",
  "Total Rewards",
  "Notices",
  "Salary Structure",
  "Reimbursements",
  "Tax Declaration",
  "Loans",
  "Bank Details",
  "Final settlement",
];

describe("MyPayrollPageContent tabs — HRMS-UX-018 (PAY-002/003 class)", () => {
  it("wraps the tab strip instead of clipping or scrolling it away", () => {
    render(<MyPayrollPageContent />);

    const list = screen.getByRole("tablist");
    expect(list.className).toContain("flex-wrap");
    expect(list.className).toContain("h-auto");
    expect(list.className).not.toContain("flex-nowrap");
    expect(list.className).not.toContain("overflow-x-auto");
    expect(list.className).not.toContain("overflow-hidden");
  });

  it("keeps every section's tab in the strip, not behind a hidden scroll", () => {
    render(<MyPayrollPageContent />);

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(EXPECTED_TABS);
  });

  it("reaches every tab's panel by activating its trigger", () => {
    render(<MyPayrollPageContent />);

    for (const label of EXPECTED_TABS) {
      const tab = screen.getByRole("tab", { name: label });
      fireEvent.mouseDown(tab);
      fireEvent.click(tab);
      expect(tab).toHaveAttribute("data-state", "active");
      expect(screen.getByRole("tabpanel")).toHaveTextContent(`${label} panel`);
    }
  });

  it("does not stretch a trigger past its own label, so a long label is never half-rendered", () => {
    render(<MyPayrollPageContent />);

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("whitespace-nowrap");
      expect(tab.className).toContain("flex-none");
    }
  });
});
