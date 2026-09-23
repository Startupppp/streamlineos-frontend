import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvoiceLineDetailSection } from "./invoice-line-detail-section";

const mutate = jest.fn();
let canUpdate: boolean;
let stored: { projectId: number; invoiceLineDetail: "summary" | "raw" } | undefined;
let isLoading: boolean;

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) =>
    permission === "build:update" ? canUpdate : false,
}));

jest.mock("@/hooks/api/invoices/project-invoice-line-detail", () => ({
  useProjectInvoiceLineDetail: () => ({
    data: stored,
    isLoading,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateProjectInvoiceLineDetail: () => ({ mutate, isPending: false }),
}));

describe("InvoiceLineDetailSection", () => {
  beforeEach(() => {
    mutate.mockClear();
    canUpdate = true;
    isLoading = false;
    stored = { projectId: 12, invoiceLineDetail: "summary" };
  });

  it("shows the safe mode for a project that never touched the setting, because summary is what the column defaults to", () => {
    render(<InvoiceLineDetailSection projectId={12} />);

    expect(
      screen.getByRole("combobox", { name: "Invoice line detail" }),
    ).toHaveTextContent("Summary lines");
  });

  it("shows the opted-in mode for a project set to raw, which is the positive half the summary assertion needs", () => {
    stored = { projectId: 12, invoiceLineDetail: "raw" };

    render(<InvoiceLineDetailSection projectId={12} />);

    expect(
      screen.getByRole("combobox", { name: "Invoice line detail" }),
    ).toHaveTextContent("Verbatim timesheet notes");
  });

  it("warns that a raw project publishes the worker's note to whoever can see the invoice", () => {
    stored = { projectId: 12, invoiceLineDetail: "raw" };

    render(<InvoiceLineDetailSection projectId={12} />);

    expect(
      screen.getByText(/repeats the worker's timesheet note word for word/i),
    ).toBeInTheDocument();
  });

  it("offers the control to a viewer holding build:update", () => {
    render(<InvoiceLineDetailSection projectId={12} />);

    expect(
      screen.getByRole("combobox", { name: "Invoice line detail" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /save line detail/i }),
    ).toBeEnabled();
  });

  it("fails closed for a viewer without build:update, and the positive case above proves the control can render", () => {
    canUpdate = false;

    render(<InvoiceLineDetailSection projectId={12} />);

    expect(
      screen.getByRole("combobox", { name: "Invoice line detail" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /save line detail/i }),
    ).toBeDisabled();
  });

  it("sends the project id alongside the chosen value, so the write cannot land on another project", async () => {
    const user = userEvent.setup();
    render(<InvoiceLineDetailSection projectId={12} />);

    await user.click(screen.getByRole("button", { name: /save line detail/i }));

    expect(mutate).toHaveBeenCalledWith(
      { projectId: 12, invoiceLineDetail: "summary" },
      expect.anything(),
    );
  });
});
