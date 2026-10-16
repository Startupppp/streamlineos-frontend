import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarOfflineEditReview } from "./calendar-offline-edit-review";

let mockIsMobile = false;

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/calendar-offline-policy", () => ({ useCalendarOfflinePolicy: jest.fn() }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: jest.fn() }));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile }));

const query = jest.requireMock<{ useQuery: jest.Mock }>("@tanstack/react-query").useQuery;
const session = jest.requireMock<{ useSession: jest.Mock }>("next-auth/react").useSession;
const can = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access").useCan;
const policy = jest.requireMock<{ useCalendarOfflinePolicy: jest.Mock }>("@/hooks/api/calendar-offline-policy").useCalendarOfflinePolicy;
const online = jest.requireMock<{ useOnlineStatus: jest.Mock }>("@/hooks/common/use-online-status").useOnlineStatus;
const refetch = jest.fn();

function setup(options: { moved?: boolean; isError?: boolean; stale?: boolean; online?: boolean; truncated?: boolean } = {}) {
  const now = Date.now();
  const originalStart = new Date(now + 86_400_000);
  const originalEnd = new Date(originalStart.getTime() + 3_600_000);
  const nextStart = new Date(originalEnd.getTime() + 3_600_000);
  const nextEnd = new Date(nextStart.getTime() + 3_600_000);
  session.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "user-1" } } });
  can.mockReturnValue(true);
  online.mockReturnValue(options.online ?? true);
  policy.mockReturnValue({ isFetchedAfterMount: true, isFetching: false, isError: false, dataUpdatedAt: now, data: { enabled: true, version: 2 } });
  query.mockReturnValue({
    data: {
      event: {
        source: "event",
        sourceRecordId: "42",
        occurrenceId: "occ-1",
        actions: { edit: true },
        sourceVersion: "3",
        start: new Date(originalStart.getTime() + (options.moved ? 30 * 60_000 : 0)).toISOString(),
        end: new Date(originalEnd.getTime() + (options.moved ? 30 * 60_000 : 0)).toISOString(),
      },
      detail: { canManage: true, localVersion: 3, rrule: null },
      coverage: "complete",
      truncated: options.truncated ?? false,
      availability: { evaluatedAt: new Date(now - (options.stale ? 61_000 : 0)).toISOString(), slots: [{ state: "free", coverageState: "complete", explanation: "Available" }] },
    },
    dataUpdatedAt: now,
    isFetchedAfterMount: true,
    isFetching: false,
    isError: options.isError ?? false,
    isLoading: false,
    refetch,
  });
  render(<CalendarOfflineEditReview intent={{
    identity: "org-1:user-1",
    sourceRecordId: "42",
    occurrenceId: "occ-1",
    expectedSourceVersion: "3",
    originalStart: originalStart.toISOString(),
    originalEnd: originalEnd.toISOString(),
    start: nextStart.toISOString(),
    end: nextEnd.toISOString(),
    policyVersion: 2,
    createdAt: now - 1000,
  }} onDiscard={jest.fn()} onContinue={jest.fn()} />);
  return screen.getByRole("button", { name: "Continue to edit form" });
}

describe("offline Calendar edit review", () => {
  beforeEach(() => { jest.clearAllMocks(); mockIsMobile = false; });

  it("keeps the review and actions in a desktop dialog", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Review offline event change" })).toHaveAttribute("data-slot", "dialog-content");
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("opens the review and actions from the bottom on mobile", () => {
    mockIsMobile = true;
    setup();
    expect(screen.getByRole("dialog", { name: "Review offline event change" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
    expect(screen.getByRole("button", { name: "Continue to edit form" })).toBeEnabled();
  });

  it("rejects an occurrence whose time changed without a parent version change", () => {
    expect(setup({ moved: true })).toBeDisabled();
  });

  it("rejects stale free data after a failed background refresh", () => {
    expect(setup({ isError: true })).toBeDisabled();
  });

  it("rejects a truncated occurrence result even when coverage reports complete", () => {
    expect(setup({ truncated: true })).toBeDisabled();
  });

  it("blocks a previously valid review after connectivity drops", () => {
    expect(setup({ online: false })).toBeDisabled();
    expect(screen.getByText("Reconnect to review this change.")).toBeInTheDocument();
  });

  it("allows a current occurrence with complete fresh availability", () => {
    expect(setup()).toBeEnabled();
  });

  it("rechecks the occurrence and availability when the review expires", () => {
    expect(setup({ stale: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Recheck current state" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
