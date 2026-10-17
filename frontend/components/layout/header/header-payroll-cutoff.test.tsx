import { render, screen } from "@testing-library/react";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import { HeaderPayrollCutoff } from "./header-payroll-cutoff";

jest.mock("@/hooks/api/payroll/payroll-cutoff", () => ({
  usePayrollCutoff: jest.fn(),
}));

const mockedCutoff = usePayrollCutoff as jest.Mock;

function futureIsoDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

describe("the header payroll cutoff chip", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when there is no cycle to report", () => {
    mockedCutoff.mockReturnValue({
      cutoff: null,
      month: "2026-10",
      isLoading: false,
    });

    const { container } = render(<HeaderPayrollCutoff />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the readiness read is still in flight", () => {
    mockedCutoff.mockReturnValue({
      cutoff: null,
      month: "2026-10",
      isLoading: true,
    });

    const { container } = render(<HeaderPayrollCutoff />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links a live cutoff at payroll readiness", () => {
    mockedCutoff.mockReturnValue({
      cutoff: { title: "Inputs lock", date: futureIsoDate(3) },
      month: "2026-10",
      isLoading: false,
    });

    render(<HeaderPayrollCutoff />);
    const link = screen.getByRole("link");

    expect(link).toHaveAttribute("href", "/payroll/readiness");
    expect(link).toHaveAccessibleName(/payroll cutoff/i);
  });

  it("keeps the chip out of the 390px header row", () => {
    mockedCutoff.mockReturnValue({
      cutoff: { title: "Inputs lock", date: futureIsoDate(3) },
      month: "2026-10",
      isLoading: false,
    });

    render(<HeaderPayrollCutoff />);

    expect(screen.getByRole("link").className).toContain("hidden");
    expect(screen.getByRole("link").className).toContain("sm:inline-flex");
  });
});
