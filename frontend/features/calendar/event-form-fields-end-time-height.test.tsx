import { render } from "@testing-library/react";
import { EventFormFields } from "./event-form-fields";
import type { RecurrenceState } from "./event-form-state";

jest.mock("./event-attendees-picker", () => ({
  EventAttendeesPicker: () => null,
}));
jest.mock("./calendar-connect-inline", () => ({
  CalendarConnectInline: () => null,
}));
jest.mock("./event-recurrence-editor", () => ({
  RecurrenceEditor: () => null,
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value }: { value: string }) => (
    <input type="text" data-testid="date-picker" defaultValue={value} readOnly />
  ),
}));

const recurrence: RecurrenceState = { type: "none" };

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
