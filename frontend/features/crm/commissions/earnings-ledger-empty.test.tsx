import { render, screen } from "@testing-library/react";
import { EarningsLedger } from "./earnings-ledger";

jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/crm/commission", () => ({
  useApproveCommissionEarning: () => ({ mutate: jest.fn(), isPending: false }),
}));

/**
 * CRM-P1-12. An empty commission ledger has to say which kind of empty it is.
 *
 * Commission earnings are created per deal by POST
 * crm/commission/earnings/calculate and by nothing else — there is no scheduled
 * run anywhere in the backend, no outbox consumer, and no caller on deal-won.
 * The ledger previously blamed a filter that does not exist (the page requests
 * every earning), so a rep reading it concluded they had earned nothing rather
 * than that nobody had worked it out yet.
 */
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
