/**
 * A failed load must not be rendered as a settled financial fact.
 *
 * This dialog exists to allocate a vendor payment against a POSTED bill. Its
 * bill list came from `const bills = billsQuery.data?.data ?? []` with no error
 * branch anywhere in the file, so a 500 on `GET /accounting/purchase-bills`
 * produced an empty, enabled selector — and the user reads an empty bill
 * selector as "this vendor has no posted bills to allocate against", which is a
 * different and much more expensive statement than "the list did not load".
 */
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorPaymentAllocationDialog } from "./vendor-payment-allocation-dialog";

const refetch = jest.fn();
const billsQuery: {
  data: { data: unknown[] } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} = { data: { data: [] }, isLoading: false, isError: false, error: null, refetch };

jest.mock("@/hooks/api/accounting", () => ({
  usePurchaseBills: () => billsQuery,
}));

jest.mock("@/hooks/api/accounting/ap", () => ({
  useCreateVendorPaymentAllocation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function render() {
  return rtlRender(<VendorPaymentAllocationDialog open onOpenChange={jest.fn()} />);
}

describe("VendorPaymentAllocationDialog — a failed bill load is visible", () => {
  beforeEach(() => {
    refetch.mockClear();
    billsQuery.data = { data: [] };
    billsQuery.isLoading = false;
    billsQuery.isError = false;
    billsQuery.error = null;
  });

  it("says the bills could not be loaded when the read fails", () => {
    billsQuery.data = undefined;
    billsQuery.isError = true;
    billsQuery.error = new Error("Vendor payment 42 is closed for allocation");
    render();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
  });

  it("surfaces the backend's own message, not a generic one", () => {
    billsQuery.data = undefined;
    billsQuery.isError = true;
    billsQuery.error = new Error("Vendor payment 42 is closed for allocation");
    render();

    expect(screen.getByRole("alert")).toHaveTextContent(/vendor payment 42 is closed for allocation/i);
  });

  it("does not offer an allocation form the user cannot complete", () => {
    billsQuery.data = undefined;
    billsQuery.isError = true;
    billsQuery.error = new Error("Vendor payment 42 is closed for allocation");
    render();

    expect(screen.queryByRole("button", { name: /^allocate$/i })).not.toBeInTheDocument();
  });

  it("offers a retry wired to the query", async () => {
    billsQuery.data = undefined;
    billsQuery.isError = true;
    billsQuery.error = new Error("Vendor payment 42 is closed for allocation");
    render();

    await userEvent.setup().click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("still renders the form when the read succeeds", () => {
    render();

    expect(screen.getByRole("button", { name: /^allocate$/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
