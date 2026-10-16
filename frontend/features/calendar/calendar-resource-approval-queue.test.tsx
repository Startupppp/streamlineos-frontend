import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarResourceApprovalQueue } from "./calendar-resource-approval-queue";

const requestedCursors: Array<string | null> = [];
const mockResolveAllocation = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/calendar/booking-resources", () => ({
  usePendingCalendarBookingAllocations: (cursor: string | null) => {
    requestedCursors.push(cursor);
    return {
      data: cursor === "next-page"
        ? { items: [{ bookingId: "booking-2", resourceId: 2, resourceName: "Second room", state: "pending", startAt: "2026-10-22T10:00:00.000Z", version: 1, canApprove: true, approvalReceiptId: "receipt-2" }], nextCursor: null }
        : { items: [{ bookingId: "booking-1", resourceId: 1, resourceName: "First room", state: "pending", startAt: "2026-10-22T09:00:00.000Z", version: 1, canApprove: true, approvalReceiptId: "receipt-1" }], nextCursor: "next-page" },
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

  await user.click(screen.getByRole("button", { name: "Reject", exact: true }));
  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Owner approval unavailable");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Reject booking" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(mockResolveAllocation).toHaveBeenCalledTimes(2);
  expect(mockResolveAllocation).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "rejected", expectedVersion: 1 }));
});
