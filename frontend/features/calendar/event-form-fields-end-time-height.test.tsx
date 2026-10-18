import { render, screen } from "@testing-library/react";
import { EventFormFields } from "./event-form-fields";
import type { RecurrenceState } from "./event-form-state";
import { defaultRecurrenceState } from "./event-recurrence-schema";

jest.mock("./event-attendees-picker", () => ({
  EventAttendeesPicker: () => null,
}));
jest.mock("./calendar-connect-inline", () => ({
  CalendarConnectInline: () => null,
}));
jest.mock("./event-recurrence-editor", () => ({
  RecurrenceEditor: () => <div data-testid="recurrence-editor" />,
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => (
    <input type="text" data-testid="date-picker" defaultValue={value} readOnly />
  ),
}));

const recurrence: RecurrenceState = defaultRecurrenceState();

const baseProps = {
  title: "",
  description: "",
  allDay: false,
  startDate: "2026-09-30",
  startTime: "09:00",
  endDate: "2026-09-30",
  endTime: "10:00",
  category: "meeting" as const,
  color: "blue",
  connections: [],
  syncConnectionId: "none",
  addConference: false,
  isEdit: false,
  showEndDate: true,
  dateTimeError: "",
  onTitleChange: jest.fn(),
  onDescriptionChange: jest.fn(),
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
  recurrence,
  onRecurrenceChange: jest.fn(),
  members: [],
  attendeeIds: [],
  onToggleAttendee: jest.fn(),
  guestEmails: [],
  onAddGuest: jest.fn(),
  onRemoveGuest: jest.fn(),
};

describe("EventFormFields — end time input height (#188)", () => {
  it("end time input does not carry h-8, which clips content in browsers with native AM/PM picker", () => {
    const { container } = render(<EventFormFields {...baseProps} />);
    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect(timeInputs.length).toBeGreaterThanOrEqual(2);
    const endTimeInput = timeInputs[1] as HTMLInputElement;
    expect(endTimeInput.className).not.toContain("h-8");
  });

  it("start time input does not carry h-8 either, confirming the class must not appear on time inputs", () => {
    const { container } = render(<EventFormFields {...baseProps} />);
    const timeInputs = container.querySelectorAll('input[type="time"]');
    const startTimeInput = timeInputs[0] as HTMLInputElement;
    expect(startTimeInput.className).not.toContain("h-8");
  });
});

describe("EventFormFields — UX notes", () => {
  const google = { id: 9, toolkit: "googlecalendar" as const, accountEmail: "me@gmail.test", accountLabel: null, status: "active" as const, isPrimary: true, createdAt: "2026-01-01T00:00:00Z" };

  it("keeps the repeat rule editable and names the sync account when editing", () => {
    render(<EventFormFields {...baseProps} isEdit connections={[google]} syncConnectionId="9" />);
    expect(screen.getByTestId("recurrence-editor")).toBeInTheDocument();
    expect(screen.getByText(/Synced to me@gmail.test/)).toBeInTheDocument();
  });

  it("says an unsynced event is not synced when editing", () => {
    render(<EventFormFields {...baseProps} isEdit />);
    expect(screen.getByText("Not synced to a calendar account.")).toBeInTheDocument();
  });

  it("shows a title counter from 80 characters and not before", () => {
    const { rerender } = render(<EventFormFields {...baseProps} title={"a".repeat(79)} />);
    expect(screen.queryByText("79/100")).toBeNull();
    rerender(<EventFormFields {...baseProps} title={"a".repeat(85)} />);
    expect(screen.getByText("85/100")).toBeInTheDocument();
  });

  it("warns when a new event starts in the past and stays quiet for a future one", () => {
    const { rerender } = render(<EventFormFields {...baseProps} startDate="2020-01-06" endDate="2020-01-06" />);
    expect(screen.getByText(/This starts in the past/)).toBeInTheDocument();
    rerender(<EventFormFields {...baseProps} startDate="2099-01-06" endDate="2099-01-06" />);
    expect(screen.queryByText(/This starts in the past/)).toBeNull();
  });
});
