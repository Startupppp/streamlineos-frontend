import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEventDetail } from "@/hooks/api/calendar";
import { CalendarNativeScenarioMove } from "./calendar-native-scenario-move";

const detail: CalendarEventDetail = {
  id: 12,
  title: "Delivery review",
  startDate: "2026-10-19T13:00:00.000Z",
  endDate: "2026-10-19T14:00:00.000Z",
  allDay: false,
  timezone: "UTC",
  color: null,
  category: "meeting",
  entityType: "ticket",
  entityId: "31",
  location: null,
  meetingUrl: null,
  description: null,
  creatorName: "Organizer",
  myRsvpStatus: null,
  linkedTicket: { id: 31, key: "BLD-31", title: "Delivery", projectId: 2, status: "open" },
  rrule: null,
  isRecurring: false,
  canManage: true,
  localVersion: 3,
};

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

it("queues a versioned native meeting move linked to the visible commitment", async () => {
  const user = userEvent.setup();
  const onQueue = jest.fn();
  render(<CalendarNativeScenarioMove detail={detail} root={{ source: "build", type: "ticket", recordId: "31" }} onQueue={onQueue} />);
  const button = screen.getByRole("button", { name: "Add meeting move to scenario" });
  expect(button).toBeDisabled();
  await user.click(screen.getByRole("combobox", { name: "Scenario meeting start minute" }));
  await user.click(screen.getByRole("option", { name: "45" }));
  await user.click(screen.getByRole("combobox", { name: "Scenario meeting end minute" }));
  await user.click(screen.getByRole("option", { name: "45" }));
  expect(button).toBeEnabled();
  await user.click(button);
  const expectedStart = new Date(detail.startDate);
  const expectedEnd = new Date(detail.endDate);
  expectedStart.setMinutes(45);
  expectedEnd.setMinutes(45);
  expect(onQueue).toHaveBeenCalledWith(expect.objectContaining({
    root: { source: "build", type: "ticket", recordId: "31" },
    step: expect.objectContaining({
      sourceKey: "calendar-native-events",
      sourceRecordId: "12",
      entityType: "event",
      sourceActionId: "move",
      expectedSourceVersion: "3",
      input: expect.objectContaining({
        linkedSource: { source: "build", type: "ticket", recordId: "31" },
        startDate: expectedStart.toISOString(),
        endDate: expectedEnd.toISOString(),
      }),
    }),
  }));
});
