import React from "react";
import { render, screen } from "@testing-library/react";
import { CalendarOfflineEditReview } from "./calendar-offline-edit-review";

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/calendar-offline-policy", () => ({ useCalendarOfflinePolicy: jest.fn() }));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const query = jest.requireMock<{ useQuery: jest.Mock }>("@tanstack/react-query").useQuery;
const session = jest.requireMock<{ useSession: jest.Mock }>("next-auth/react").useSession;
const can = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access").useCan;
const policy = jest.requireMock<{ useCalendarOfflinePolicy: jest.Mock }>("@/hooks/api/calendar-offline-policy").useCalendarOfflinePolicy;

function setup(options: { moved?: boolean; isError?: boolean } = {}) {
  const now = Date.now();
  const originalStart = new Date(now + 86_400_000);
  const originalEnd = new Date(originalStart.getTime() + 3_600_000);
  const nextStart = new Date(originalEnd.getTime() + 3_600_000);
  const nextEnd = new Date(nextStart.getTime() + 3_600_000);
  session.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "user-1" } } });
  can.mockReturnValue(true);
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
      availability: { evaluatedAt: new Date(now).toISOString(), slots: [{ state: "free", coverageState: "complete", explanation: "Available" }] },
    },
    dataUpdatedAt: now,
    isFetchedAfterMount: true,
    isFetching: false,
    isError: options.isError ?? false,
    isLoading: false,
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
  beforeEach(() => jest.clearAllMocks());

  it("rejects an occurrence whose time changed without a parent version change", () => {
    expect(setup({ moved: true })).toBeDisabled();
  });

  it("rejects stale free data after a failed background refresh", () => {
    expect(setup({ isError: true })).toBeDisabled();
  });

  it("allows a current occurrence with complete fresh availability", () => {
    expect(setup()).toBeEnabled();
  });
});
