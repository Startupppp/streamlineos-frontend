import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

const useEssForm16 = jest.fn();
jest.mock("@/hooks/api/payroll/form16", () => ({
  useEssForm16: () => useEssForm16(),
  downloadOwnForm16: jest.fn(),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { EssForm16Section } from "./ess-form16-section";

describe("ESS Form 16", () => {
  it("says honestly that nothing is released yet", () => {
    useEssForm16.mockReturnValue({ data: { documents: [] }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<EssForm16Section />);
    expect(screen.getByText("Your Form 16 appears here once your employer releases it.")).toBeInTheDocument();
  });

  it("lists each released year with a download", () => {
    useEssForm16.mockReturnValue({
      data: { documents: [{ financialYear: "2025-26", fileName: "Form16-2025-26.pdf", releasedAt: "2026-06-10T00:00:00.000Z" }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<EssForm16Section />);
    expect(screen.getByText("Form 16 · FY 2025-26")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("rolls the financial year over in April", () => {
    const { currentFinancialYear } = jest.requireActual<typeof import("@/hooks/api/payroll/form16")>("@/hooks/api/payroll/form16");
    expect(currentFinancialYear(new Date(2026, 2, 31))).toBe("2025-26");
    expect(currentFinancialYear(new Date(2026, 3, 1))).toBe("2026-27");
  });
});
