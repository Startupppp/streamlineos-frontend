import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const loans = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssLoans: () => loans(),
  useCreateLoan: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import { EssLoansSection } from "./ess-loans-section";

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  loans.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-008 a failing loans read does not claim the employee has no loans", () => {
  it("renders a loan on a healthy session, so the failure cases below are not passing on a panel that never mounts", () => {
    loans.mockReturnValue({
      data: [
        {
          id: 7,
          loanType: "SALARY_ADVANCE",
          status: "ACTIVE",
          principalAmount: "50000",
          outstandingAmount: "25000",
          emiAmount: "5000",
          tenureMonths: 10,
          disbursedAt: "2026-01-01",
          createdAt: "2026-01-01",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<EssLoansSection allowRequests hideToolbar />);

    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no loans or advances/i)).toBeNull();
  });

  it("opts the loans read out of the route boundary, so a 500 degrades this panel instead of blanking /me/pay", () => {
    const source = readFileSync(join(process.cwd(), "hooks/api/payroll/ess.ts"), "utf8");
    const declaration = source.slice(source.indexOf("export function useEssLoans"));
    const body = declaration.slice(0, declaration.indexOf("\n}\n"));

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(body).toContain("...INLINE_READ_ERROR,");
  });

  it("shows an inline error with retry when the loans read 500s", () => {
    loans.mockReturnValue(failing(500));
    render(<EssLoansSection allowRequests hideToolbar />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim there are no loans or advances when the read failed", () => {
    loans.mockReturnValue(failing(500));
    render(<EssLoansSection allowRequests hideToolbar />);

    expect(screen.queryByText(/no loans or advances/i)).toBeNull();
  });

  it("offers no Request Loan next step while the panel is erroring, because retry is the action then", () => {
    loans.mockReturnValue(failing(500));
    render(<EssLoansSection allowRequests />);

    expect(screen.queryByRole("button", { name: /request loan/i })).toBeNull();
  });

  it("retries the failed read on this panel rather than reloading the route", () => {
    loans.mockReturnValue(failing(500));
    render(<EssLoansSection allowRequests hideToolbar />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state with its CTA when the employee genuinely has no loans", () => {
    render(<EssLoansSection allowRequests />);

    expect(screen.getByText(/no loans or advances/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /request loan/i }).length).toBeGreaterThan(0);
  });
});
