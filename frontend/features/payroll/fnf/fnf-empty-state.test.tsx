import { render, screen } from "@testing-library/react";
import { FnfTable } from "./fnf-table";

let granted = new Set<string>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

jest.mock("@/hooks/api/payroll/fnf", () => ({
  useFnfSettlements: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => granted.has(key),
}));

jest.mock("./fnf-detail-sheet", () => ({ FnfDetailSheet: () => null }));

/** QA 2026-10-13 [P2]: Payroll → Final settlement was empty with no create path and no explanation. */
describe("the empty Final settlement list", () => {
  it("explains that a settlement starts from an exit and links to both HR steps", () => {
    granted = new Set(["hr:exit:view", "hr:payroll:approve", "hr:exit:manage"]);
    render(<FnfTable />);

    expect(screen.getByText(/start from an employee exit/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /HR → Exit/ })).toHaveAttribute("href", "/hr/exit");
    expect(screen.getByRole("link", { name: /Start a settlement/ })).toHaveAttribute("href", "/hr/fnf");
  });

  it("keeps the explanation but offers no link that would end at Access Denied", () => {
    granted = new Set();
    render(<FnfTable />);

    expect(screen.getByText(/start from an employee exit/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
