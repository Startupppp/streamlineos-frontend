import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({
    text,
    className,
  }: {
    text: string;
    lines?: number;
    className?: string;
  }) => <span className={className}>{text}</span>,
}));

jest.mock("@/features/payroll/setup/lib/constants", () => ({
  COMPLEXITY_CONFIG: {
    SIMPLE: { label: "Simple", className: "simple-chip" },
    MODERATE: { label: "Moderate", className: "moderate-chip" },
    ADVANCED: { label: "Advanced", className: "advanced-chip" },
  },
}));

jest.mock("@/components/ui/semantic-badge", () => ({
  SemanticBadge: ({
    label,
    className,
    tone: _tone,
  }: {
    label: string;
    className?: string;
    tone?: string;
  }) => <span className={className}>{label}</span>,
}));

import { TemplateCard } from "@/features/payroll/shared/template-card";
import { PayrollStatusBadge } from "@/features/payroll/shared/payroll-status-badge";
import type { TemplateRow, ToggleKey } from "@/types/payroll/setup";

const EMPTY_TOGGLES: Record<ToggleKey, boolean> = {
  pf: false,
  esi: false,
  professionalTax: false,
  tds: true,
  gratuity: false,
  lwf: false,
  lopFromAttendance: false,
  overtime: false,
  timesheets: false,
  leaveSync: true,
  expenseSync: false,
  salesIncentives: false,
  manualAdjustments: false,
  reimbursements: false,
  bonuses: false,
  incentives: false,
  loans: false,
  contractorPayments: false,
  multiCurrency: false,
  employeeDeclarations: false,
  payrollVarianceWarnings: false,
  requireLockedPayrollInputs: false,
  countryComplianceChecklist: false,
  globalPaymentReport: false,
  bankPayoutFile: false,
  payslipPublishing: true,
  emailPayslips: false,
  approvalWorkflow: false,
  managerApproval: false,
  financeApproval: false,
  lockAfterApproval: false,
  essShowSalaryStructure: false,
  essAllowBankUpdate: false,
  essAllowLoanRequests: false,
  essAllowTaxDeclarations: false,
  essAllowReimbursements: false,
};

const MOCK_TEMPLATE: TemplateRow = {
  id: 1,
  orgId: null,
  key: "INDIAN_STANDARD",
  name: "Indian Standard Payroll",
  description: "Standard payroll for Indian companies.",
  bestFor: "Companies with 10–200 employees in India",
  complexity: "SIMPLE",
  badge: null,
  category: "INDIAN_STANDARD",
  defaultToggles: EMPTY_TOGGLES,
  defaultComponents: [
    { code: "BASIC", name: "Basic Salary", type: "EARNING", calcMethod: "FIXED" },
    { code: "HRA", name: "HRA", type: "EARNING", calcMethod: "PERCENT_OF_BASIC" },
    { code: "PF", name: "PF", type: "EMPLOYER_CONTRIBUTION", calcMethod: "PERCENT_OF_BASIC" },
  ],
  isSystem: true,
  isRecommended: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("a11y — Payroll surface (TemplateCard + PayrollStatusBadge)", () => {
  it("TemplateCard passes axe at desktop (1280px)", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(
        <TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("TemplateCard passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(
        <TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("TemplateCard passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(
        <TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("TemplateCard renders template name and category", () => {
    render(<TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />);
    expect(screen.getByText("Indian Standard Payroll")).toBeInTheDocument();
    expect(screen.getByText("INDIAN STANDARD · System")).toBeInTheDocument();
  });

  it("TemplateCard keyboard Enter calls onSelect", () => {
    const onSelect = jest.fn();
    render(<TemplateCard template={MOCK_TEMPLATE} onSelect={onSelect} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("TemplateCard keyboard Space calls onSelect", () => {
    const onSelect = jest.fn();
    render(<TemplateCard template={MOCK_TEMPLATE} onSelect={onSelect} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("TemplateCard with onSelect has role=button and tabIndex=0", () => {
    render(<TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("BITE PROOF (keyboard) — card without onSelect has no role=button", () => {
    const { container } = render(<TemplateCard template={MOCK_TEMPLATE} />);
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("BITE PROOF (axe) — selected card still passes axe", async () => {
    const { baseElement } = render(
      <TemplateCard template={MOCK_TEMPLATE} selected={true} onSelect={jest.fn()} />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("PayrollStatusBadge — run COMPLETED passes axe", async () => {
    const { baseElement } = render(
      <PayrollStatusBadge variant="run" status="COMPLETED" />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("PayrollStatusBadge — run FAILED passes axe", async () => {
    const { baseElement } = render(
      <PayrollStatusBadge variant="run" status="FAILED" />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("PayrollStatusBadge — run PROCESSING renders correct label", () => {
    render(<PayrollStatusBadge variant="run" status="PROCESSING" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("PayrollStatusBadge — policy ACTIVE renders correct label", () => {
    render(<PayrollStatusBadge variant="policy" status="ACTIVE" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("BITE PROOF (viewport 375px) — template card is reachable on mobile", () => {
    const restore = atViewport("mobile");
    try {
      render(<TemplateCard template={MOCK_TEMPLATE} onSelect={jest.fn()} />);
      expect(screen.getByText("Indian Standard Payroll")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
