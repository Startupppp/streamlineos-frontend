import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";

const rows = [
  {
    partyId: "p-1",
    name: "Acme Trading",
    partyType: "CUSTOMER",
    status: "active",
    email: "ops@acme.example",
    phone: "+441234567890",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    partyId: "p-2",
    name: "Globex",
    partyType: "VENDOR",
    status: "blocked",
    email: "",
    phone: "",
    createdAt: "2026-08-02T09:00:00.000Z",
  },
];

describe("RecordDetail", () => {
  it("groups fields into the sections the description declares", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[0]!} />);
    expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
  });

  it("titles the record from the field the description nominates", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[0]!} />);
    expect(screen.getByRole("heading", { level: 1, name: "Acme Trading" })).toBeInTheDocument();
  });

  it("omits a section whose fields are all empty, rather than showing rows of dashes", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[1]!} />);
    expect(screen.queryByRole("heading", { name: "Contact" })).not.toBeInTheDocument();
  });
});

describe("RecordForm", () => {
  it("renders a control per field, typed from the description", () => {
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^Website/)).toHaveAttribute("type", "url");
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  it("uses the platform form primitives rather than bespoke controls", () => {
    const { container } = render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    expect(container.querySelectorAll("[data-slot='form-item']").length).toBeGreaterThan(0);
  });

  it("refuses to submit while a required field is empty, and says which", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed email against the schema the description generated", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "not-an-email" } });
    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values once the required fields are filled", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Initech" } });
    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Initech" }),
        expect.anything(),
      ),
    );
  });

  it("prefills from an existing record when editing", () => {
    render(<RecordForm layout={PARTY_LAYOUT} initial={rows[0]} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/^Name/)).toHaveValue("Acme Trading");
  });

  it("associates every control with its label", () => {
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    for (const label of [/^Name/, /^Legal name/, /^Email/, /^Phone/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
});

describe("RecordForm create vs edit", () => {
  it("omits an edit-only field when creating", () => {
    render(<RecordForm layout={PARTY_LAYOUT} mode="create" onSubmit={jest.fn()} />);
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
  });

  it("includes it when editing", () => {
    render(<RecordForm layout={PARTY_LAYOUT} mode="edit" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("renders the fields the hand-written form had forgotten", () => {
    render(<RecordForm layout={PARTY_LAYOUT} mode="create" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });
});
