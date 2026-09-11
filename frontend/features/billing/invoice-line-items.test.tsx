/**
 * The edit dialog on the invoice detail screen is the only shipped caller that
 * PATCHes an invoice's line items. It used to send the legacy four-field line —
 * description, quantity, rate, amount — and nothing else, so the server had no
 * tax basis to write and replaced every line's GST rate with 0.00 and every
 * HSN/SAC code with NULL. These tests pin the wire shape that carries them.
 *
 * Money here is rupees, as decimal strings on the way in (the persisted
 * `invoice_items` row) and as JSON numbers on the way out (the write DTO).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockMutate = jest.fn();

jest.mock("@/hooks/api/invoice", () => ({
  useUpdateInvoice: () => ({ mutate: mockMutate, isPending: false }),
}));

// The dialog now gates itself on PATCH /invoices/{invoiceId}'s own key. These
// tests are about the wire shape, so they run as a caller who holds it;
// `invoice-write-surface-gates.test.tsx` owns the deny half.
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
        // The server always stores "0" here; per-line gst_rate is the real basis.
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

    // Rupees: 1000 @ 18% = 180 plus 200 @ 5% = 10, so 190 — not the 0 the
    // stored blended tax_rate of "0" would produce.
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
