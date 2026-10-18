import React from "react";
import { render, screen } from "@testing-library/react";
import { EmployeeDetailPage } from "./employee-detail-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/payroll/employees/x",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/features/payroll/runs/salary-profile-sheet", () => ({ SalaryProfileSheet: () => null }));

const profile = {
  id: 7, userId: "a32a5b84-6ae1-4507-afe4-0245dbac2423", workerId: null, workerType: "EMPLOYEE", currency: "INR",
  payoutCurrency: null, annualCtc: "600000.00", taxRegime: null, costCenter: null, status: "ACTIVE", effectiveFrom: "2026-01-01",
};
const components = [
  { id: 1, componentId: 11, calcMethodOverride: null, amount: null, percent: "150.0000", formulaOverride: null, sortOrder: 0, code: "QA1015BASIC", name: "QA1015 Basic", type: "EARNING", calcMethod: "FIXED", taxable: true },
];
jest.mock("@/hooks/api/payroll/employees", () => ({
  useEmployeeProfile: () => ({ data: { active: profile, components, history: [], employee: { name: "Asha Rao", email: "asha@example.com" } }, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useEmployeeProfileHistory: () => ({ data: [] }),
}));

const mockUseSalaryPreview = jest.fn();
jest.mock("@/hooks/api/payroll/salary-preview", () => ({
  useSalaryPreview: (...args: unknown[]) => mockUseSalaryPreview(...args),
}));

beforeEach(() => {
  mockUseSalaryPreview.mockReturnValue({
    data: {
      monthly: { gross: "96000.00", deductions: "4600.00", employerContributions: "1800.00", net: "91400.00" },
      warnings: ["Basic is counted 2 times (Basic Salary, QA1015 Basic). Keep one of these lines."],
    },
    isLoading: false,
    isError: false,
    error: null,
  });
});

describe("EmployeeDetailPage estimate (PAY-B-033) — the profile summed fixed lines while the run used the engine", () => {
  it("asks the payroll engine for the profile's own components and shows its figures and warnings", () => {
    render(<EmployeeDetailPage employeeUserId={profile.userId} />);

    expect(mockUseSalaryPreview).toHaveBeenCalledWith(
      { annualCtc: "600000.00", workerType: "EMPLOYEE", regime: undefined, componentIds: [11] },
      { enabled: true },
    );
    expect(screen.getByText("₹96,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Basic is counted 2 times/)).toBeInTheDocument();
  });

  it("heads the page with the employee's name, never the user id (PAY-B-013)", () => {
    render(<EmployeeDetailPage employeeUserId={profile.userId} />);
    expect(screen.queryByText(profile.userId)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Asha Rao" })).toBeInTheDocument();
  });

  it("hides a stale percent on a fixed component (PAY-B-030)", () => {
    render(<EmployeeDetailPage employeeUserId={profile.userId} />);
    expect(screen.queryByText("150%")).not.toBeInTheDocument();
    expect(screen.queryByText("150.0000%")).not.toBeInTheDocument();
  });
});

describe("EmployeeDetailPage estimate without an active policy (PAY-B-011)", () => {
  it("explains the policy is not active and links to setup instead of a generic error", () => {
    mockUseSalaryPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("needs an active payroll policy", 409, "PAYROLL_POLICY_NOT_ACTIVE"),
    });
    render(<EmployeeDetailPage employeeUserId={profile.userId} />);
    expect(screen.getByRole("link", { name: "Finish payroll setup" })).toHaveAttribute("href", "/payroll/setup");
    expect(screen.queryByText(/Estimate unavailable/)).not.toBeInTheDocument();
  });
});
