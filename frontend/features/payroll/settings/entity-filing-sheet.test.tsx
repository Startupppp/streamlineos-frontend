import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EntityFilingSheet } from "./entity-filing-sheet";
import type { PayrollEntity } from "@/hooks/api/payroll/entities";

const mutate = jest.fn();
jest.mock("@/hooks/api/payroll/entities", () => ({
  useUpdatePayrollEntity: () => ({ mutate, isPending: false }),
}));

const entity: PayrollEntity = {
  id: 4,
  legalName: "Acme India Pvt Ltd",
  countryCode: "IN",
  stateCode: "KA",
  baseCurrency: "INR",
  pan: null,
  tan: null,
  pfEstablishmentCode: null,
  esiCode: null,
  ptStateCode: "KA",
  status: "ACTIVE",
};

beforeEach(() => {
  jest.clearAllMocks();
});

function renderSheet() {
  render(<EntityFilingSheet entity={entity} onClose={jest.fn()} />);
}

describe("EntityFilingSheet", () => {
  it("rejects a malformed PAN without sending anything", async () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("PAN must look like ABCDE1234F")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("uppercases codes as typed and sends only the changed fields", async () => {
    renderSheet();
    const pan = screen.getByLabelText("PAN");
    fireEvent.change(pan, { target: { value: "abcde1234f" } });
    expect(pan).toHaveValue("ABCDE1234F");
    fireEvent.change(screen.getByLabelText("TAN (for TDS)"), { target: { value: "blrA12345b" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({ pan: "ABCDE1234F", tan: "BLRA12345B" });
  });
});
