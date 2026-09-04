/**
 * The customer-invoicing surface renders three ledger mutations — Mark Issued,
 * Mark Paid and Void — plus New Invoice. Every one of them used to render
 * unconditionally: `invoices-client.tsx` held no `useCan` at all, so a member
 * with nothing but a read grant was shown a Void control whose confirmation
 * was also missing, and whose backend route reverses the invoice's journal
 * entry.
 *
 * Each control is pinned to the key its own route declares in
 * `contracts/openapi.json`:
 *   POST /invoices                -> accounting:create
 *   PATCH /invoices/{invoiceId}   -> accounting:update
 *   POST /invoices/{invoiceId}/void -> accounting:manage
 */
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvoicesClient } from "./invoices-client";

const mockUseCan = jest.fn();
const mockVoidMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

const invoice = {
  id: 42,
  invoiceNumber: "INV-0042",
  status: "ISSUED",
  total: "1000.00",
  dueDate: "2026-02-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  client: { id: 1, name: "Acme" },
};

const draftInvoice = { ...invoice, id: 43, invoiceNumber: "INV-0043", status: "DRAFT" };

let rows: unknown[] = [invoice];

jest.mock("@/hooks/api/invoice", () => ({
  useInvoices: () => ({
    data: { items: rows, total: rows.length, page: 1, pageSize: 20, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useInvoiceStats: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
  useUpdateInvoice: () => ({ mutate: jest.fn(), isPending: false }),
  useVoidInvoice: () => ({ mutate: mockVoidMutate, isPending: false }),
}));

jest.mock("@/features/billing/create-invoice-dialog", () => ({
  CreateInvoiceDialog: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/billing/invoices",
  useSearchParams: () => new URLSearchParams(),
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
  await user.click(screen.getAllByRole("button", { name: /more options/i })[0]);
}

beforeEach(() => {
  mockUseCan.mockReset();
  mockVoidMutate.mockReset();
  rows = [invoice];
});

describe("InvoicesClient — every mutation control carries its route's key", () => {
  it("hides Void from a reader and shows it to accounting:manage", async () => {
    grantOnly("accounting:read");
    const { unmount } = render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/view detail/i)).toBeInTheDocument();
    expect(screen.queryByText(/^void$/i)).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:manage");
    render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/^void$/i)).toBeInTheDocument();
  });

  it("hides Mark as Paid from a reader and shows it to accounting:update", async () => {
    grantOnly("accounting:read");
    const { unmount } = render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/view detail/i)).toBeInTheDocument();
    expect(screen.queryByText(/mark as paid/i)).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:update");
    render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/mark as paid/i)).toBeInTheDocument();
  });

  it("hides Mark as Issued on a draft from a reader and shows it to accounting:update", async () => {
    rows = [draftInvoice];
    grantOnly("accounting:read");
    const { unmount } = render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/view detail/i)).toBeInTheDocument();
    expect(screen.queryByText(/mark as issued/i)).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:update");
    render(<InvoicesClient />);
    await openRowActions();
    expect(await screen.findByText(/mark as issued/i)).toBeInTheDocument();
  });

  it("hides New Invoice from a reader and shows it to accounting:create", () => {
    grantOnly("accounting:read");
    const { unmount } = render(<InvoicesClient />);
    expect(screen.queryByRole("button", { name: /new invoice/i })).not.toBeInTheDocument();
    unmount();

    grantOnly("accounting:create");
    render(<InvoicesClient />);
    expect(screen.getByRole("button", { name: /new invoice/i })).toBeInTheDocument();
  });

  it("never asks for a key no /invoices route declares", () => {
    grantOnly("accounting:manage");
    render(<InvoicesClient />);

    const asked = mockUseCan.mock.calls.map(([key]: [string]) => key);
    expect(asked).toEqual(
      expect.arrayContaining(["accounting:create", "accounting:update", "accounting:manage"]),
    );
    expect(asked).not.toContain("accounting:receivables:manage");
    expect(asked).not.toContain("accounting:receivables:read");
  });
});

describe("InvoicesClient — Void asks before it reverses a journal entry", () => {
  it("does not fire the void mutation until the confirmation is accepted", async () => {
    grantOnly("accounting:manage");
    const user = userEvent.setup();
    render(<InvoicesClient />);
    await openRowActions();

    await user.click(await screen.findByText(/^void$/i));
    expect(mockVoidMutate).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/void this invoice\?/i);
    expect(dialog).toHaveTextContent(/reverses its posted journal entry/i);

    await user.click(screen.getByRole("button", { name: /void invoice/i }));
    expect(mockVoidMutate).toHaveBeenCalledWith(42, expect.anything());
  });
});
