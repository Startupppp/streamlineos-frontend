import { render, screen } from "@testing-library/react";
import { EssBankSection } from "./ess-bank-section";
import { EssReimbursementsSection } from "./ess-reimbursements-section";

const idle = { isLoading: false, isError: false, error: null, refetch: jest.fn() };

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssBank: () => ({ ...idle, data: { hasBank: false, masked: null } }),
  useEssReimbursements: () => ({ ...idle, data: [] }),
  useUpdateBank: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("./ess-reimbursements-submit-sheet", () => ({
  SubmitSheet: () => null,
}));

function countByName(pattern: RegExp): number {
  return screen.queryAllByRole("button", { name: pattern }).length;
}

describe("BUG-002 an empty My Pay tab offers one primary CTA, not two", () => {
  it("offers exactly one Add Bank Details when the page header already owns the action", () => {
    render(<EssBankSection hideToolbar />);

    expect(countByName(/add bank details/i)).toBe(0);
    expect(screen.getByText(/no bank details on file/i)).toBeInTheDocument();
  });

  it("offers exactly one Add Bank Details when the section owns its own toolbar, so the toolbar is the only primary", () => {
    render(<EssBankSection />);

    expect(countByName(/add bank details/i)).toBe(1);
  });

  it("offers exactly one Submit Claim when the page header already owns the action", () => {
    render(<EssReimbursementsSection hideToolbar />);

    expect(countByName(/submit claim/i)).toBe(0);
    expect(screen.getByText(/no claims yet/i)).toBeInTheDocument();
  });

  it("offers exactly one Submit Claim when the section owns its own toolbar, so the toolbar is the only primary", () => {
    render(<EssReimbursementsSection />);

    expect(countByName(/submit claim/i)).toBe(1);
  });

  it("still tells the reader what the empty tab is for, so removing the duplicate CTA did not remove the guidance", () => {
    render(<EssBankSection hideToolbar />);

    expect(screen.getByText(/add your bank account/i)).toBeInTheDocument();
  });
});
