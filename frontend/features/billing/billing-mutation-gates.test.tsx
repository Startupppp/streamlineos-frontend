/**
 * The rest of the billing mutation surface, pinned to the same oracle
 * (`contracts/openapi.json` `x-permission`):
 *
 *   POST /invoices                    -> accounting:create   (NewInvoiceForm)
 *   POST /invoices/{id}/payments      -> accounting:create   (RecordPaymentDialog)
 *   PATCH /invoices/{id}              -> accounting:update   (Edit, Mark Issued, Mark Paid)
 *   POST /invoices/{id}/void          -> accounting:manage   (Void)
 *   POST /billing/checkout            -> billing:subscription:manage (PlanCard upgrade)
 *
 * All five rendered unconditionally before this: no file under
 * `features/billing/` except `ai-credits-settings-page` and `billing-profile-tab`
 * held a `useCan` at all.
 */
import type { ComponentProps } from "react";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Invoice } from "@/types/invoice";
import { InvoiceDetailActions } from "./invoice-detail-actions";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { PlanCard } from "./components/plan-card";
import { NewInvoiceForm } from "./new-invoice/new-invoice-form";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("@/hooks/api/invoice", () => ({
  useRecordPayment: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateInvoice: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/payments", () => ({
  useManualMethods: () => ({ data: [] }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const issued = {
  id: 42,
  invoiceNumber: "INV-0042",
  status: "ISSUED",
  total: "1000.00",
} as unknown as Invoice;

const draft = { ...issued, status: "DRAFT" } as unknown as Invoice;

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

const noop = () => undefined;

function detailActions(invoice: Invoice) {
  return (
    <InvoiceDetailActions
      invoice={invoice}
      outstanding={1000}
      isUpdating={false}
      onEdit={noop}
      onRecordPayment={noop}
      onStatusUpdate={noop}
      onVoid={noop}
      onDownload={noop}
    />
  );
}

beforeEach(() => {
  mockUseCan.mockReset();
});

describe("InvoiceDetailActions", () => {
  it("shows a reader only Download PDF", () => {
    grantOnly("accounting:read");
    render(detailActions(issued));

    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^void$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("gates Void on accounting:manage", () => {
    grantOnly("accounting:update", "accounting:create");
    const { unmount } = render(detailActions(issued));
    expect(screen.queryByRole("button", { name: /^void$/i })).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:manage");
    render(detailActions(issued));
    expect(screen.getByRole("button", { name: /^void$/i })).toBeInTheDocument();
  });

  it("gates Mark Paid and Edit on accounting:update", () => {
    grantOnly("accounting:manage");
    const { unmount } = render(detailActions(issued));
    expect(screen.queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:update");
    render(detailActions(issued));
    expect(screen.getByRole("button", { name: /mark paid/i })).toBeInTheDocument();

    grantOnly("accounting:update");
    render(detailActions(draft));
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("gates Record Payment on accounting:create", () => {
    grantOnly("accounting:update");
    const { unmount } = render(detailActions(issued));
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:create");
    render(detailActions(issued));
    expect(screen.getByRole("button", { name: /record payment/i })).toBeInTheDocument();
  });

  it("confirms before voiding, and says the journal entry is reversed", async () => {
    const onVoid = jest.fn();
    grantOnly("accounting:manage");
    const user = userEvent.setup();
    render(
      <InvoiceDetailActions
        invoice={issued}
        outstanding={1000}
        isUpdating={false}
        onEdit={noop}
        onRecordPayment={noop}
        onStatusUpdate={noop}
        onVoid={onVoid}
        onDownload={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^void$/i }));
    expect(onVoid).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/reverses its posted journal entry/i);

    await user.click(screen.getByRole("button", { name: /void invoice/i }));
    expect(onVoid).toHaveBeenCalledTimes(1);
  });
});

describe("RecordPaymentDialog", () => {
  it("refuses the form to a caller without accounting:create", () => {
    grantOnly("accounting:read", "accounting:update", "accounting:manage");
    render(
      <RecordPaymentDialog open invoiceId={42} outstanding={1000} onOpenChange={noop} />,
    );

    expect(screen.getByText(/cannot record payments/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("renders the form to a caller holding accounting:create", () => {
    grantOnly("accounting:create");
    render(
      <RecordPaymentDialog open invoiceId={42} outstanding={1000} onOpenChange={noop} />,
    );

    expect(screen.getByRole("button", { name: /record payment/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot record payments/i)).not.toBeInTheDocument();
  });
});

describe("NewInvoiceForm", () => {
  it("refuses to render the create form without accounting:create", () => {
    grantOnly("accounting:read", "accounting:update", "accounting:manage");
    render(<NewInvoiceForm onCreated={noop} />);

    expect(screen.getByText(/cannot create invoices/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create invoice/i })).not.toBeInTheDocument();
  });

  it("renders the create form with accounting:create", () => {
    grantOnly("accounting:create");
    render(<NewInvoiceForm onCreated={noop} />);

    expect(screen.getByRole("button", { name: /create invoice/i })).toBeInTheDocument();
  });
});

describe("PlanCard", () => {
  const config = { monthlyPrice: 999, annualPrice: 9590, label: "Professional", features: ["Everything"] };

  function planCard(overrides?: Partial<ComponentProps<typeof PlanCard>>) {
    return (
      <PlanCard
        plan="PROFESSIONAL"
        config={config}
        billingCycle="monthly"
        currentPlan="STARTER"
        currentStatus="ACTIVE"
        upgradingPlan={null}
        isBusy={false}
        isConfigured
        selectedPlan={null}
        onUpgrade={noop}
        onSelect={noop}
        {...overrides}
      />
    );
  }

  it("hides Upgrade without billing:subscription:manage", () => {
    grantOnly("billing:invoices:view");
    render(planCard());

    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only a billing administrator/i)).toBeInTheDocument();
  });

  it("shows Upgrade with billing:subscription:manage", () => {
    grantOnly("billing:subscription:manage");
    render(planCard());

    expect(screen.getByRole("button", { name: /upgrade/i })).toBeInTheDocument();
  });

  it("disables the upgrade button for every plan while isBusy is true", () => {
    grantOnly("billing:subscription:manage");
    render(planCard({ isBusy: true, upgradingPlan: "PROFESSIONAL" }));

    const button = screen.getByRole("button", { name: /processing/i });
    expect(button).toBeDisabled();
  });

  it("disables Upgrade when isConfigured is false (payment gateway not ready)", () => {
    grantOnly("billing:subscription:manage");
    render(planCard({ isConfigured: false }));

    expect(screen.getByRole("button", { name: /upgrade/i })).toBeDisabled();
  });
});
