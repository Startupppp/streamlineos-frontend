import { render, screen } from "@testing-library/react";
import { EarningsLedger } from "./earnings-ledger";

jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/crm/commission", () => ({
  useApproveCommissionEarning: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe("EarningsLedger, empty", () => {
  it("does not blame a filter the page does not have", () => {
    render(<EarningsLedger earnings={[]} locale="en-GB" />);
    expect(screen.queryByText(/filter/i)).not.toBeInTheDocument();
  });

  it("says the calculation has to be run, so empty is not the same as nothing earned", () => {
    render(<EarningsLedger earnings={[]} locale="en-GB" />);
    expect(screen.getByText(/No earnings recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no scheduled run/i)).toBeInTheDocument();
  });
});
