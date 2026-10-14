import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShiftFormSheet } from "./shift-form-sheet";
import type { ShiftTemplate } from "@/hooks/api/hr/shifts";

const createMutate = jest.fn();
const updateMutate = jest.fn();

jest.mock("@/hooks/api/hr/shifts", () => ({
  useCreateShift: () => ({ mutate: createMutate, isPending: false }),
  useUpdateShift: () => ({ mutate: updateMutate, isPending: false }),
}));

const MESSAGE = "End time must be after start time, or turn on Night Shift";

const existing: ShiftTemplate = {
  id: 7,
  orgId: "org-1",
  name: "Morning Shift",
  type: "FIXED",
  startTime: "09:00:00",
  endTime: "18:00:00",
  breakMinutes: 60,
  isNightShift: false,
  gracePeriodMinutes: 15,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function setTime(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.setPointerCapture = () => undefined;

describe("shift form end-before-start rule", () => {
  beforeEach(() => {
    createMutate.mockClear();
    updateMutate.mockClear();
  });

  it("blocks an inverted window inline on End Time and never opens the confirm", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    setTime(/start time/i, "18:00");
    setTime(/end time/i, "09:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText("Save shift changes?")).not.toBeInTheDocument();
  });

  it("blocks equal start and end", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    setTime(/end time/i, "09:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
  });

  it("allows an inverted window once Night Shift is on and shows a wrapped duration", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={{ ...existing, isNightShift: true }} />);
    setTime(/start time/i, "22:00");
    setTime(/end time/i, "06:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Save shift changes?")).toBeInTheDocument();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByText(/Duration 8h, ends the next day/)).toBeInTheDocument();
  });

  async function pickType(user: ReturnType<typeof userEvent.setup>, name: string) {
    fireEvent.keyDown(screen.getByRole("combobox", { name: /type/i }), { key: "ArrowDown" });
    const option = await screen.findByRole("option", { name });
    await user.click(option);
  }

  it("selecting NIGHT turns the flag on so 22:00-06:00 reaches the confirm without the error", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    expect(screen.getByRole("switch", { name: /night shift/i })).not.toBeChecked();
    await pickType(user, "NIGHT");
    expect(screen.getByRole("switch", { name: /night shift/i })).toBeChecked();
    setTime(/start time/i, "22:00");
    setTime(/end time/i, "06:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Save shift changes?")).toBeInTheDocument();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("a non-night type with an inverted window is still blocked, and a night type is not", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    await pickType(user, "ROTATIONAL");
    expect(screen.getByRole("switch", { name: /night shift/i })).not.toBeChecked();
    setTime(/start time/i, "22:00");
    setTime(/end time/i, "06:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText("Save shift changes?")).not.toBeInTheDocument();
    await pickType(user, "NIGHT");
    await waitFor(() => expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument());
  });

  it("switching away from NIGHT leaves the flag on so the overnight window is not discarded", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    await pickType(user, "NIGHT");
    await pickType(user, "FIXED");
    expect(screen.getByRole("switch", { name: /night shift/i })).toBeChecked();
    setTime(/start time/i, "22:00");
    setTime(/end time/i, "06:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Save shift changes?")).toBeInTheDocument();
  });

  it("manually clearing the flag under NIGHT is honoured and the inverted window is blocked", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    await pickType(user, "NIGHT");
    await user.click(screen.getByRole("switch", { name: /night shift/i }));
    expect(screen.getByRole("switch", { name: /night shift/i })).not.toBeChecked();
    setTime(/start time/i, "22:00");
    setTime(/end time/i, "06:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
  });

  it("opening an existing NIGHT shift with the flag off does not rewrite the flag", () => {
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={{ ...existing, type: "NIGHT", isNightShift: false }} />);
    expect(screen.getByRole("switch", { name: /night shift/i })).not.toBeChecked();
  });

  it("opening an existing NIGHT shift with the flag on keeps it on", () => {
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={{ ...existing, type: "NIGHT", isNightShift: true }} />);
    expect(screen.getByRole("switch", { name: /night shift/i })).toBeChecked();
  });

  it("lets a normal 09:00-18:00 shift through to the confirm with its duration", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.getByText("Save shift changes?")).toBeInTheDocument());
    expect(screen.getByText(/Duration 9h\./)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });
});
