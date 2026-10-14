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

  it("lets a normal 09:00-18:00 shift through to the confirm with its duration", async () => {
    const user = userEvent.setup();
    render(<ShiftFormSheet open onOpenChange={jest.fn()} shift={existing} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.getByText("Save shift changes?")).toBeInTheDocument());
    expect(screen.getByText(/Duration 9h\./)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });
});
