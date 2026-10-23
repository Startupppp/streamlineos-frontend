import { fireEvent, render } from "@testing-library/react";
import { EventCreateForm } from "./event-create-form";
import type { FormState, RecurrenceState } from "./event-form-state";
import { defaultRecurrenceState } from "./event-recurrence-schema";

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ children, footer, open }: { children: React.ReactNode; footer: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="app-sheet"><div data-testid="sheet-body">{children}</div>{footer}</div> : null,
}));

jest.mock("./ticket-picker-dialog", () => ({
  TicketPickerDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? <div data-testid="ticket-picker"><button type="button" onClick={() => onOpenChange(false)}>Close ticket picker</button></div> : null,
}));

jest.mock("./event-form-fields", () => ({
  EventFormFields: ({ startTime, endTime, showEndDate }: { startTime: string; endTime: string; showEndDate: boolean }) => (
    <div data-testid="event-form-fields">
      <input type="time" name="startTime" value={startTime} readOnly />
      {showEndDate && <input type="time" name="endTime" value={endTime} readOnly />}
    </div>
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  XIcon: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, form, type }: { children: React.ReactNode; form: string; type: "submit" }) => <button form={form} type={type}>{children}</button>,
}));

const recurrence: RecurrenceState = defaultRecurrenceState();

const baseForm: FormState = {
  title: "Team sync",
  description: "",
  location: "",
  locationError: "",
  allDay: false,
  startDate: "2026-09-30",
  startTime: "09:00",
  endDate: "2026-09-30",
  endTime: "10:00",
  category: "meeting",
  color: "blue",
  syncConnectionId: "none",
  addConference: false,
  attendeeIds: [],
  guestEmails: null,
  reminder: null,
  recurrence: defaultRecurrenceState(),
};

const baseProps = {
  open: true,
  onOpenChange: jest.fn(),
  isMobile: false,
  isEdit: false,
  form: baseForm,
  titleError: "",
  dateTimeError: "",
  showEndDate: false,
  members: [],
  connections: [],
  linkedTicket: null,
  existingEntityId: null,
  ticketPickerOpen: true,
  isPending: false,
  onClose: jest.fn(),
  onTitleChange: jest.fn(),
  onDescriptionChange: jest.fn(),
  onLocationChange: jest.fn(),
  onAllDayChange: jest.fn(),
  onStartDateChange: jest.fn(),
  onStartTimeChange: jest.fn(),
  onEndDateChange: jest.fn(),
  onEndTimeChange: jest.fn(),
  onCategoryChange: jest.fn(),
  onColorChange: jest.fn(),
  onSyncConnectionChange: jest.fn(),
  onAddConferenceChange: jest.fn(),
  onShowEndDate: jest.fn(),
  onToggleAttendee: jest.fn(),
  onAddGuest: jest.fn(),
  onRemoveGuest: jest.fn(),
  onReminderChange: jest.fn(),
  onOpenTicketPicker: jest.fn(),
  onTicketSelect: jest.fn(),
  onRemoveLinkedTicket: jest.fn(),
  onTicketPickerChange: jest.fn(),
  onSave: jest.fn(),
  recurrence,
  onRecurrenceChange: jest.fn(),
};

describe("EventCreateForm responsive sheet", () => {
  it("keeps the ticket picker inside the sheet body", () => {
    const { getByTestId } = render(<EventCreateForm {...baseProps} />);
    const sheetBody = getByTestId("sheet-body");
    const ticketPicker = getByTestId("ticket-picker");
    expect(sheetBody.contains(ticketPicker)).toBe(true);
  });

  it("closing the ticket picker leaves the event sheet open", () => {
    const onOpenChange = jest.fn();
    const onTicketPickerChange = jest.fn();
    const { getByRole } = render(<EventCreateForm {...baseProps} onOpenChange={onOpenChange} onTicketPickerChange={onTicketPickerChange} />);
    fireEvent.click(getByRole("button", { name: "Close ticket picker" }));
    expect(onTicketPickerChange).toHaveBeenCalledWith(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("submits the body form from the shared sheet footer", () => {
    const onSave = jest.fn();
    const { getByRole } = render(<EventCreateForm {...baseProps} onSave={onSave} />);
    fireEvent.click(getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("submits the visible time even when the controlled form state has not updated", () => {
    const onSave = jest.fn();
    const { container, getByRole } = render(<EventCreateForm {...baseProps} onSave={onSave} />);
    const startTime = container.querySelector('input[name="startTime"]');
    if (!(startTime instanceof HTMLInputElement)) throw new Error("Start time input missing");
    startTime.value = "17:00";

    fireEvent.click(getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ startTime: "17:00" });
  });
});
