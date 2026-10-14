import { render, screen } from "@testing-library/react";
import { PublicationsTab } from "./publications-tab";

let canViewRuns = true;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

jest.mock("@/hooks/api/payroll", () => ({
  usePayrollRuns: () => ({ data: { data: [] }, isLoading: false }),
  useRunPublications: () => ({ data: undefined, isLoading: false }),
  usePublishPayslips: () => ({ mutate: jest.fn(), isPending: false }),
  downloadPayslipPdf: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canViewRuns,
}));

/** QA 2026-10-13 [P3]: Payroll → Payslips was an empty shell with no explanation or action. */
describe("Payslips with no approved run", () => {
  it("says where payslips come from and links to Run payroll", () => {
    canViewRuns = true;
    render(<PublicationsTab canManage />);

    expect(screen.getByText(/appear after a payroll run is approved/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Run payroll/ })).toHaveAttribute("href", "/payroll/runs");
  });

  it("omits the link for a viewer who cannot open payroll runs", () => {
    canViewRuns = false;
    render(<PublicationsTab canManage />);

    expect(screen.getByText(/appear after a payroll run is approved/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
