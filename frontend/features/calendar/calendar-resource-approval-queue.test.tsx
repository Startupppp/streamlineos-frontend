import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarResourceApprovalQueue } from "./calendar-resource-approval-queue";

const requestedCursors: Array<string | null> = [];
const mockResolveAllocation = jest.fn();
const mockFirstPageItems = jest.fn();

afterEach(() => mockFirstPageItems.mockReset());

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/calendar/booking-resources", () => ({
  usePendingCalendarBookingAllocations: (cursor: string | null) => {
    requestedCursors.push(cursor);
    return {
      data: cursor === "next-page"
        ? { items: [{ bookingId: "booking-2", resourceId: 2, resourceName: "Second room", ownership: "calendar", sourceKey: null, state: "pending", startAt: "2026-10-22T10:00:00.000Z", version: 1, canApprove: true, approvalReceiptId: "receipt-2" }], nextCursor: null }
        : { items: mockFirstPageItems() ?? [{ bookingId: "booking-1", resourceId: 1, resourceName: "First room", ownership: "calendar", sourceKey: null, state: "pending", startAt: "2026-10-22T09:00:00.000Z", version: 1, canApprove: true, approvalReceiptId: "receipt-1" }], nextCursor: "next-page" },
      access: { allowed: true, denied: false, pending: false, unavailable: false },
      isFetching: false,
      isPending: false,
      isError: false,
    };
  },
  useResolveCalendarBookingAllocation: () => ({ isPending: false, mutateAsync: mockResolveAllocation }),
}));

it("shows a later approval page and returns to the first page", async () => {
  requestedCursors.length = 0;
  const user = userEvent.setup();
  render(<CalendarResourceApprovalQueue />);

  expect(screen.getByText("First room")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Second room")).toBeInTheDocument();
  expect(requestedCursors).toContain("next-page");

  await user.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByText("First room")).toBeInTheDocument();
  expect(requestedCursors.at(-1)).toBeNull();
});

it("keeps a rejected owner decision open on failure and closes after a successful retry", async () => {
  mockResolveAllocation.mockReset();
  mockResolveAllocation.mockRejectedValueOnce(new Error("Owner approval unavailable"));
  mockResolveAllocation.mockResolvedValueOnce({ bookingStatus: "declined" });
  const user = userEvent.setup();
  render(<CalendarResourceApprovalQueue />);

  await user.click(screen.getByRole("button", { name: /^Reject$/ }));
  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Owner approval unavailable");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(mockResolveAllocation).toHaveBeenCalledTimes(2);
  expect(mockResolveAllocation).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "rejected", expectedVersion: 1 }));
});

it("blocks Inventory rejection without an owner receipt while retaining HR and Calendar decisions", async () => {
  mockResolveAllocation.mockReset().mockResolvedValue({ bookingStatus: "declined" });
  mockFirstPageItems.mockReturnValue([
    { bookingId: "booking-inventory", resourceId: 7, resourceName: "Projector", ownership: "source", sourceKey: "inventory.equipment", state: "pending", startAt: "2100-01-01T10:00:00.000Z", version: 1, canApprove: false, approvalReceiptId: null },
    { bookingId: "booking-hr", resourceId: 8, resourceName: "HR asset", ownership: "source", sourceKey: "hr.asset", state: "pending", startAt: "2100-01-01T10:00:00.000Z", version: 1, canApprove: false, approvalReceiptId: null },
    { bookingId: "booking-room", resourceId: 9, resourceName: "Room", ownership: "calendar", sourceKey: null, state: "pending", startAt: "2100-01-01T10:00:00.000Z", version: 1, canApprove: true, approvalReceiptId: "calendar:9:1" },
  ]);
  const user = userEvent.setup();
  render(<CalendarResourceApprovalQueue />);

  const [inventoryReject, hrReject, roomReject] = screen.getAllByRole("button", { name: /^Reject$/ });
  expect(inventoryReject).toBeDisabled();
  await user.click(hrReject!);
  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  await waitFor(() => expect(mockResolveAllocation).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 8, outcome: "rejected", ownerReceiptId: "resource:8:1" })));
  await user.click(roomReject!);
  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  await waitFor(() => expect(mockResolveAllocation).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 9, outcome: "rejected", ownerReceiptId: "calendar:9:1" })));
  expect(mockResolveAllocation).toHaveBeenCalledTimes(2);
});
