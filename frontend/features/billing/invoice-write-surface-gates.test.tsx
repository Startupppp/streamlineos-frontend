/**
 * The two invoice write surfaces the first gating pass missed.
 *
 * `invoices-client.tsx` and `invoice-detail-actions.tsx` were gated, but the
 * dialogs they open were not — and neither dialog is mounted conditionally:
 *
 *   CreateInvoiceDialog — mounted unconditionally by `invoices-client.tsx`,
 *     rendered a full create form with a Create Invoice submit for any caller.
 *   InvoiceLineItems    — mounted unconditionally by `invoice-detail-content.tsx`,
 *     rendered the Edit Invoice dialog with a Save Changes button that rewrites
 *     line items, GST rate and totals.
 *
 * `useCreateInvoice` / `useUpdateInvoice` go through `useAuthorizedMutation`,
 * so submitting either without the key does not reach the server — it throws
 * "Missing permission: …" and toasts. That is a late, confusing failure, not a
 * gate: the control must not be offered in the first place. Each is pinned to
 * the key its own route declares (POST /invoices -> accounting:create,
 * PATCH /invoices/{invoiceId} -> accounting:update).
 */
import { render as rtlRender, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoiceLineItems } from "./invoice-line-items";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("@/hooks/api/invoice", () => ({
  useCreateInvoice: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateInvoice: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

const noop = () => undefined;

function lineItems(editOpen: boolean) {
  return (
    <InvoiceLineItems
      invoiceId={42}
      lineItems={[{ description: "Consulting", quantity: 1, rate: 1000, amount: 1000, gstRate: 18 }]}
      subtotal={1000}
      taxRate={18}
      taxAmount={180}
      discount={0}
      total={1180}
      totalPaid={0}
      outstanding={1180}
      dueDate={null}
      notes={null}
      currency="INR"
      editOpen={editOpen}
      onEditOpenChange={noop}
    />
  );
}

beforeEach(() => {
  mockUseCan.mockReset();
});

describe("CreateInvoiceDialog carries its route's key, not its opener's", () => {
  it("refuses the create form to a caller without accounting:create", () => {
    grantOnly("accounting:read", "accounting:update", "accounting:manage");
    render(<CreateInvoiceDialog open onOpenChange={noop} />);

    expect(screen.getByText(/cannot create invoices/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/description/i)).not.toBeInTheDocument();
  });

  it("renders the create form to a caller holding accounting:create", () => {
    grantOnly("accounting:create");
    render(<CreateInvoiceDialog open onOpenChange={noop} />);

    expect(screen.getByRole("button", { name: /create invoice/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot create invoices/i)).not.toBeInTheDocument();
  });

  it("asks for accounting:create and nothing the /invoices routes do not declare", () => {
    grantOnly("accounting:create");
    render(<CreateInvoiceDialog open onOpenChange={noop} />);

    const asked = mockUseCan.mock.calls.map(([key]: [string]) => key);
    expect(asked).toContain("accounting:create");
    expect(asked).not.toContain("accounting:receivables:create");
  });
});

describe("InvoiceLineItems edit dialog carries accounting:update", () => {
  it("refuses the edit form to a caller without accounting:update", () => {
    grantOnly("accounting:read", "accounting:create", "accounting:manage");
    render(lineItems(true));

    expect(screen.getByText(/cannot edit this invoice/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add item/i })).not.toBeInTheDocument();
  });

  it("renders the edit form to a caller holding accounting:update", () => {
    grantOnly("accounting:update");
    render(lineItems(true));

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot edit this invoice/i)).not.toBeInTheDocument();
  });

  it("still shows the read-only line-item table to a caller with no write key", () => {
    grantOnly("accounting:read");
    render(lineItems(false));

    expect(screen.getByText(/consulting/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });
});
