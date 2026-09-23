import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateInvoiceSheet } from "./generate-invoice-sheet";

const mutate = jest.fn();
let allowed: Record<string, boolean>;
let entries: Array<Record<string, unknown>>;

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => allowed[key] ?? false,
}));

jest.mock("@/hooks/api/timesheets/billing-invoice", () => ({
  useUninvoicedEntries: () => ({
    data: { items: entries },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useGenerateInvoiceFromTimesheets: () => ({ mutate, isPending: false }),
}));

function renderSheet() {
  return render(
    <GenerateInvoiceSheet
      open
      onOpenChange={jest.fn()}
      startDate="2026-09-01"
      endDate="2026-09-30"
      projectId={10}
    />,
  );
}

describe("generating an invoice from approved time", () => {
  beforeEach(() => {
    mutate.mockClear();
    allowed = { "accounting:create": true, "timesheets:billing:invoice": true };
    entries = [
      {
        id: 77,
        projectId: 10,
        projectName: "Website Redesign",
        date: "2026-09-01",
        hours: "4.00",
        billRate: "150.00",
        currency: "INR",
        description: "Design pass",
      },
      {
        id: 78,
        projectId: 10,
        projectName: "Website Redesign",
        date: "2026-09-02",
        hours: "2.00",
        billRate: "150.00",
        currency: "INR",
        description: "Review",
      },
    ];
  });

  it("arrives with every approved entry already selected and priced, so the freelancer keys in nothing the timesheet already holds", () => {
    renderSheet();

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    for (const box of screen.getAllByRole("checkbox"))
      expect(box).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("Design pass", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("4.00 h", { exact: false })).toBeInTheDocument();
  });

  it("carries the project, entry count, hours and subtotal into the invoice step without a second entry of them", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.getByText("6.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate invoice" }),
    ).toBeEnabled();
  });

  it("submits the entry ids it displayed, which is what carries the provenance link to the invoice lines", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Generate invoice" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ timesheetEntryIds: [77, 78] }),
      expect.anything(),
    );
  });

  it("drops a deselected entry from the submission rather than billing it anyway", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getAllByRole("checkbox")[1]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Generate invoice" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ timesheetEntryIds: [77] }),
      expect.anything(),
    );
  });

  it("offers no generate control at all without accounting:create, and the positive case above proves the control can render", () => {
    allowed = { "accounting:create": false };
    renderSheet();

    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Generate invoice" }),
    ).toBeNull();
  });

  it("names the summary mode on the step that generates the invoice, so raw customer-visible notes are never a surprise", async () => {
    const user = userEvent.setup();
    entries = entries.map((entry) => ({
      ...entry,
      invoiceLineDetail: "summary",
    }));
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("invoice-line-detail-mode")).toHaveTextContent(
      "Summary lines",
    );
  });

  it("names the raw mode when every selected project opted into it, which is the positive half the summary assertion needs", async () => {
    const user = userEvent.setup();
    entries = entries.map((entry) => ({ ...entry, invoiceLineDetail: "raw" }));
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("invoice-line-detail-mode")).toHaveTextContent(
      "Verbatim timesheet notes",
    );
  });

  it("names the safe mode when the selection spans a raw project and a summary one, matching what the server will actually write", async () => {
    const user = userEvent.setup();
    entries = [
      { ...entries[0], projectId: 10, invoiceLineDetail: "raw" },
      { ...entries[1], projectId: 11, invoiceLineDetail: "summary" },
    ];
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("invoice-line-detail-mode")).toHaveTextContent(
      "Summary lines",
    );
  });

  it("falls back to the safe mode for time with no project, which carries no setting at all", async () => {
    const user = userEvent.setup();
    entries = entries.map((entry) => ({
      ...entry,
      projectId: null,
      projectName: null,
      invoiceLineDetail: null,
    }));
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("invoice-line-detail-mode")).toHaveTextContent(
      "Summary lines",
    );
  });

  it("refuses to continue when the freelancer clears the whole selection", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
