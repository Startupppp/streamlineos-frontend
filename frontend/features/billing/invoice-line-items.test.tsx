import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockMutate = jest.fn();

jest.mock("@/hooks/api/invoice", () => ({
  useUpdateInvoice: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key === "accounting:update",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { InvoiceLineItems } from "./invoice-line-items";

const STORED_LINES = [
  {
    description: "Consulting",
    quantity: "1.0000",
    rate: "1000.0000",
    amount: "1000.0000",
    gstRate: "18.00",
    hsnSacCode: "9983",
  },
  {
    description: "Catering",
    quantity: "2.0000",
    rate: "100.0000",
    amount: "200.0000",
    gstRate: "5.00",
    hsnSacCode: "9963",
  },
];

function renderDialog(overrides: { lineItems?: typeof STORED_LINES } = {}) {
  return render(
    <TooltipProvider>
      <InvoiceLineItems
        invoiceId={7}
        lineItems={overrides.lineItems ?? STORED_LINES}
        subtotal="1200.0000"
        taxRate="0"
        taxAmount="190.00"
        discount="0"
        total="1390.00"
        totalPaid={0}
        outstanding={1390}
        dueDate={null}
        notes={null}
        currency="INR"
        editOpen
        onEditOpenChange={jest.fn()}
      />
    </TooltipProvider>,
  );
}

describe("the invoice edit dialog carries each line's tax basis", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("sends gstRate and hsnSacCode alongside the legacy line fields", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const payload = mockMutate.mock.calls[0][0] as {
      id: number;
      lineItems: unknown[];
    };
    expect(payload.id).toBe(7);
    expect(payload.lineItems).toEqual([
      {
        description: "Consulting",
        quantity: 1,
        rate: 1000,
        amount: 1000,
        gstRate: 18,
        hsnSacCode: "9983",
      },
      {
        description: "Catering",
        quantity: 2,
        rate: 100,
        amount: 200,
        gstRate: 5,
        hsnSacCode: "9963",
      },
    ]);
  });

  it("previews the tax the server will store, not the dead blended rate", () => {
    renderDialog();

    expect(screen.getAllByText("₹190.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹1,390.00").length).toBeGreaterThan(0);
  });

  it("gives a newly added line no tax basis rather than inheriting one", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    fireEvent.change(screen.getByLabelText("Quantity for item 3"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Rate for item 3"), {
      target: { value: "50" },
    });
    const descriptions = screen.getAllByPlaceholderText("Description");
    fireEvent.change(descriptions[descriptions.length - 1], {
      target: { value: "Stationery" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    const payload = mockMutate.mock.calls[0][0] as {
      lineItems: { description: string; gstRate: number }[];
    };
    expect(payload.lineItems).toHaveLength(3);
    expect(payload.lineItems[2]).toMatchObject({
      description: "Stationery",
      amount: 100,
      gstRate: 0,
    });
  });

  it("omits hsnSacCode for a line that never had one", () => {
    renderDialog({
      lineItems: [
        {
          description: "Consulting",
          quantity: "1.0000",
          rate: "1000.0000",
          amount: "1000.0000",
          gstRate: "18.00",
          hsnSacCode: null as unknown as string,
        },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    const payload = mockMutate.mock.calls[0][0] as { lineItems: object[] };
    expect(payload.lineItems[0]).toEqual({
      description: "Consulting",
      quantity: 1,
      rate: 1000,
      amount: 1000,
      gstRate: 18,
    });
  });
});
