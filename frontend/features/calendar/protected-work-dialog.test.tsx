import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProtectedWorkDialog } from "./protected-work-dialog";

const mockIsMobile = jest.fn(() => false);
const mockRegister = jest.fn().mockResolvedValue({});

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange, ariaLabel }: { value: string; onChange: (value: string) => void; ariaLabel: string }) => (
    <input type="date" aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
jest.mock("@/hooks/api/calendar-protected-work", () => ({
  useCalendarProtectedWork: () => ({ data: [], isLoading: false, isError: false }),
  useCalendarProtectedWorkSuggestions: () => ({ data: undefined, isLoading: false, isError: false }),
  useRegisterCalendarProtectedWork: () => ({ isPending: false, mutateAsync: mockRegister }),
  useMoveCalendarProtectedWork: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUndoCalendarProtectedWork: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
  mockRegister.mockClear();
});

const eventStart = new Date("2026-10-22T09:00:00.000Z");
const eventEnd = new Date("2026-10-22T10:00:00.000Z");

it("keeps the six-field form in a desktop sheet and submits through its footer", async () => {
  const onClose = jest.fn();
  render(<ProtectedWorkDialog eventId={36} eventStart={eventStart} eventEnd={eventEnd} open onClose={onClose} />);

  const sheet = screen.getByRole("dialog", { name: "Protected work" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(sheet).toHaveClass("data-[state=open]:slide-in-from-right");
  expect(screen.getByRole("spinbutton", { name: "Estimated minutes" })).toHaveValue(60);
  fireEvent.change(screen.getByLabelText("Deadline"), { target: { value: "2026-10-23" } });
  await userEvent.click(screen.getByRole("button", { name: "Protect time" }));

  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ eventId: 36, estimateMinutes: 60, priority: 50 })));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("opens the protected-work form from the bottom on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  render(<ProtectedWorkDialog eventId={36} eventStart={eventStart} eventEnd={eventEnd} open onClose={jest.fn()} />);

  expect(screen.getByRole("dialog", { name: "Protected work" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
});
