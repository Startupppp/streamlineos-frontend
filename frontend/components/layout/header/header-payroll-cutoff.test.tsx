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
    const links = screen.getAllByRole("link");

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/payroll/readiness");
      expect(link).toHaveAccessibleName(/payroll cutoff/i);
    }
  });

  it("keeps the labeled chip for lg+ and an icon with tooltip below lg", () => {
    mockedCutoff.mockReturnValue({
      cutoff: { title: "Inputs lock", date: futureIsoDate(3) },
      month: "2026-10",
      isLoading: false,
    });

    render(<HeaderPayrollCutoff />);
    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(2);
    expect(links[0].className).toContain("lg:hidden");
    expect(links[0].className).toContain("size-9");
    expect(links[1].className).toContain("hidden");
    expect(links[1].className).toContain("lg:inline-flex");
  });

  it("showcases a calendar icon with tooltip in the compact mobile header", () => {
    mockedCutoff.mockReturnValue({
      cutoff: { title: "Inputs lock", date: futureIsoDate(3) },
      month: "2026-10",
      isLoading: false,
    });

    render(<HeaderPayrollCutoff compact />);
    const link = screen.getByRole("link");

    expect(link).toHaveAttribute("href", "/payroll/readiness");
    expect(link).toHaveAccessibleName(/payroll cutoff/i);
    expect(link.className).toContain("size-9");
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link).not.toHaveAttribute("title");
  });
});
