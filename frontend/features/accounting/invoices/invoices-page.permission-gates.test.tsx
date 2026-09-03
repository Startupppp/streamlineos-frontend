/**
 * The "Void Invoice" row action fires `POST /invoices/{invoiceId}/void`, which
 * declares `accounting:manage` in `contracts/openapi.json` — the same key
 * `useVoidInvoice` itself carries (`hooks/api/accounting/ar.ts:128`).
 *
 * The control used to be gated on `accounting:receivables:manage`, which is
 * bound to no route at all. `useCan` is an exact lookup, so that hid the action
 * from every user holding the grant that actually authorizes it, and showed it
 * to anyone holding the decorative key — for whom `useAuthorizedMutation`
 * throws `Missing permission: accounting:manage` before the request is sent.
 */
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountingInvoicesPage } from "./invoices-page";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

/** Only the fields the row and its actions read; the hook it is served through is mocked. */
const invoice = {
  id: 42,
  invoiceNumber: "INV-0042",
  status: "SENT",
  total: "1000.00",
  amountPaid: "0",
  dueDate: "2026-02-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  client: { id: 1, name: "Acme" },
};

jest.mock("@/hooks/api/invoice", () => ({
  useInvoices: () => ({
    data: { items: [invoice], total: 1, page: 1, pageSize: 20, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useInvoiceStats: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
}));

jest.mock("@/hooks/api/accounting/ar", () => ({
  useVoidInvoice: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/accounting/sales/record-payment-dialog", () => ({
  RecordPaymentDialog: () => null,
}));

jest.mock("@/features/accounting/sales/collections-tab", () => ({
  CollectionsTab: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

async function openRowActions(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("button", { name: /actions/i })[0]);
}

describe("AccountingInvoicesPage — the Void gate matches the void route", () => {
  beforeEach(() => {
    mockUseCan.mockReset();
  });

  it("shows Void Invoice to a user holding accounting:manage", async () => {
    grantOnly("accounting:manage");
    render(<AccountingInvoicesPage />);
    await openRowActions();

    expect(await screen.findByText(/void invoice/i)).toBeInTheDocument();
  });

  it("hides Void Invoice from a user holding only the route-unbound accounting:receivables:manage", async () => {
    grantOnly("accounting:receivables:manage");
    render(<AccountingInvoicesPage />);
    await openRowActions();

    expect(await screen.findByText(/view detail/i)).toBeInTheDocument();
    expect(screen.queryByText(/void invoice/i)).not.toBeInTheDocument();
  });

  it("never asks for a permission that no backend route declares", () => {
    grantOnly("accounting:manage");
    render(<AccountingInvoicesPage />);

    const asked = mockUseCan.mock.calls.map(([key]: [string]) => key);
    expect(asked).not.toContain("accounting:receivables:manage");
  });
});
