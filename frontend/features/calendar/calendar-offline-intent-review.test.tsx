import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarOfflineIntentReview } from "./calendar-offline-intent-review";

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

function setup(options: { stale?: boolean; isFetching?: boolean; isError?: boolean; online?: boolean } = {}) {
  const now = Date.now();
  session.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "user-1" } } });
  can.mockReturnValue(true);
  online.mockReturnValue(options.online ?? true);
  policy.mockReturnValue({ isFetchedAfterMount: true, isFetching: false, isError: false, dataUpdatedAt: now, data: { enabled: true, version: 2 } });
  query.mockReturnValue({
    data: { evaluatedAt: new Date(now - (options.stale ? 61_000 : 0)).toISOString(), slots: [{ state: "free", coverageState: "complete", explanation: "Available" }] },
    dataUpdatedAt: now,
    isFetchedAfterMount: true,
    isFetching: options.isFetching ?? false,
    isError: options.isError ?? false,
    isLoading: false,
    refetch,
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
  beforeEach(() => { jest.clearAllMocks(); mockIsMobile = false; });

  it("keeps the time review and actions in a desktop dialog", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Review offline time draft" })).toHaveAttribute("data-slot", "dialog-content");
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("opens the time review and actions from the bottom on mobile", () => {
    mockIsMobile = true;
    setup();
    expect(screen.getByRole("dialog", { name: "Review offline time draft" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
    expect(screen.getByRole("button", { name: "Continue to event form" })).toBeEnabled();
  });

  it("keeps continue disabled while live availability refreshes", () => {
    expect(setup({ isFetching: true })).toBeDisabled();
  });

  it("keeps continue disabled when a refresh fails with old free data retained", () => {
    expect(setup({ isError: true })).toBeDisabled();
  });

  it("keeps a recent free result disabled after connectivity drops", () => {
    expect(setup({ online: false })).toBeDisabled();
    expect(screen.getByText("Reconnect to review this draft.")).toBeInTheDocument();
  });

  it("allows review to continue only after fresh complete availability", () => {
    expect(setup()).toBeEnabled();
  });

  it("offers a fresh availability check after the previous result expires", () => {
    expect(setup({ stale: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Recheck availability" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
