import React from "react";
import { render, screen } from "@testing-library/react";
import { CalendarOfflineIntentReview } from "./calendar-offline-intent-review";

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

function setup(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  session.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "user-1" } } });
  can.mockReturnValue(true);
  policy.mockReturnValue({ isFetchedAfterMount: true, isFetching: false, isError: false, dataUpdatedAt: now, data: { enabled: true, version: 2 } });
  query.mockReturnValue({
    data: { evaluatedAt: new Date(now).toISOString(), slots: [{ state: "free", coverageState: "complete", explanation: "Available" }] },
    dataUpdatedAt: now,
    isFetchedAfterMount: true,
    isFetching: false,
    isError: false,
    isLoading: false,
    ...overrides,
  });
  const intent = {
    identity: "org-1:user-1",
    start: new Date(now + 86_400_000).toISOString(),
    end: new Date(now + 86_400_000 + 3_600_000).toISOString(),
    policyVersion: 2,
    createdAt: now - 1000,
  };
  render(<CalendarOfflineIntentReview intent={intent} onDiscard={jest.fn()} onContinue={jest.fn()} />);
  return screen.getByRole("button", { name: "Continue to event form" });
}

describe("offline Calendar intent review", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps continue disabled while live availability refreshes", () => {
    expect(setup({ isFetching: true })).toBeDisabled();
  });

  it("keeps continue disabled when a refresh fails with old free data retained", () => {
    expect(setup({ isError: true })).toBeDisabled();
  });

  it("allows review to continue only after fresh complete availability", () => {
    expect(setup()).toBeEnabled();
  });
});
