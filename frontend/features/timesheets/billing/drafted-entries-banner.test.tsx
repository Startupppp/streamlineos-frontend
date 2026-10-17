/**
 * The stranded-record regression, on the frontend side: before this banner
 * existed, an entry `createInvoiceDraft` flipped to `INVOICE_DRAFTED` was
 * invisible on the billing queue — nothing rendered it, and nothing offered
 * a way back to billable. `voidEntry` (`entries.service.ts`) refuses to void
 * anything already drafted, so a stranded entry stayed stuck until a later
 * invoicing pass happened to claim it.
 *
 * Gated on `timesheets:billing:invoice` — the same permission
 * `useCreateInvoiceDraft` already requires — per FE-44/FE-122: a control this
 * consequential fails closed, and the negative case is asserted alongside
 * the positive one so it cannot pass by simply never rendering.
 */
import { render as rtlRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DraftedEntriesBanner } from "./drafted-entries-banner";

const mockUseCan = jest.fn();
const mockReleaseMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

let entries: Array<{ id: number; invoicingStatus: string }> = [];

jest.mock("@/hooks/api/timesheets/billing-invoice", () => ({
  useUninvoicedEntries: () => ({ data: { items: entries } }),
}));

jest.mock("@/hooks/api/timesheets-core/billing", () => ({
  useReleaseInvoiceDraft: () => ({ mutate: mockReleaseMutate, isPending: false }),
}));

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

const PROPS = { startDate: "2026-08-01", endDate: "2026-08-31", projectId: null };

beforeEach(() => {
  mockUseCan.mockReset();
  mockReleaseMutate.mockReset();
  entries = [];
});

describe("DraftedEntriesBanner — permission gate", () => {
  it("renders nothing without timesheets:billing:invoice, even when drafted entries exist", () => {
    mockUseCan.mockReturnValue(false);
    entries = [{ id: 77, invoicingStatus: "INVOICE_DRAFTED" }];

    const { container } = render(<DraftedEntriesBanner {...PROPS} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the banner and its Release control once the permission is granted (control gate positive)", () => {
    mockUseCan.mockReturnValue(true);
    entries = [{ id: 77, invoicingStatus: "INVOICE_DRAFTED" }];

    render(<DraftedEntriesBanner {...PROPS} />);

    expect(screen.getByRole("button", { name: "Release" })).toBeInTheDocument();
  });
});

describe("DraftedEntriesBanner — what counts as stranded", () => {
  it("renders nothing when every entry is plain UNINVOICED", () => {
    mockUseCan.mockReturnValue(true);
    entries = [{ id: 1, invoicingStatus: "UNINVOICED" }, { id: 2, invoicingStatus: "UNINVOICED" }];

    const { container } = render(<DraftedEntriesBanner {...PROPS} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("counts only the drafted entries, ignoring plain uninvoiced ones mixed into the same read", () => {
    mockUseCan.mockReturnValue(true);
    entries = [
      { id: 1, invoicingStatus: "UNINVOICED" },
      { id: 2, invoicingStatus: "INVOICE_DRAFTED" },
      { id: 3, invoicingStatus: "INVOICE_DRAFTED" },
    ];

    render(<DraftedEntriesBanner {...PROPS} />);

    expect(screen.getByText(/2 entries are drafted/)).toBeInTheDocument();
  });
});

describe("DraftedEntriesBanner — release action", () => {
  it("confirms before releasing, then submits exactly the drafted entry ids", async () => {
    mockUseCan.mockReturnValue(true);
    entries = [
      { id: 2, invoicingStatus: "INVOICE_DRAFTED" },
      { id: 5, invoicingStatus: "UNINVOICED" },
      { id: 9, invoicingStatus: "INVOICE_DRAFTED" },
    ];
    const user = userEvent.setup();

    render(<DraftedEntriesBanner {...PROPS} />);
    await user.click(screen.getByRole("button", { name: "Release" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Release" }));

    expect(mockReleaseMutate).toHaveBeenCalledWith(
      { timesheetEntryIds: [2, 9] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
