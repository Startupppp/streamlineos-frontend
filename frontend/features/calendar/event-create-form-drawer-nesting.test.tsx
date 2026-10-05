import { render } from "@testing-library/react";
import { EventCreateForm } from "./event-create-form";
import type { FormState, RecurrenceState } from "./event-form-state";
import { defaultRecurrenceState } from "./event-recurrence-schema";

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-content">{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./ticket-picker-dialog", () => ({
  TicketPickerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="ticket-picker" /> : null,
}));

jest.mock("./event-form-fields", () => ({
  EventFormFields: () => <div data-testid="event-form-fields" />,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  LoadingButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
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
  onOpenTicketPicker: jest.fn(),
  onTicketSelect: jest.fn(),
  onRemoveLinkedTicket: jest.fn(),
  onTicketPickerChange: jest.fn(),
  onSave: jest.fn(),
  recurrence,
  onRecurrenceChange: jest.fn(),
};

describe("EventCreateForm — TicketPickerDialog nesting (#189)", () => {
  it("TicketPickerDialog is rendered inside DrawerContent so its dismiss does not escape to the parent Drawer", () => {
    const { getByTestId } = render(<EventCreateForm {...baseProps} />);
    const drawerContent = getByTestId("drawer-content");
    const ticketPicker = getByTestId("ticket-picker");
    expect(drawerContent.contains(ticketPicker)).toBe(true);
  });

  it("calling onTicketPickerChange(false) does not trigger the outer onOpenChange with false", () => {
    render(<EventCreateForm {...baseProps} />);
    baseProps.onTicketPickerChange(false);
    expect(baseProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
