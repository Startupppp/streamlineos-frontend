import { act, render, screen } from "@testing-library/react";
import type { LiveHold } from "@/types/crm/autonomy";
import { PendingSendsPanel } from "./pending-sends-panel";

const mockHolds = jest.fn();
const mockCancel = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/autonomy", () => ({
  useLiveHolds: () => mockHolds(),
  useCancelHold: () => mockCancel(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const hold = (over: Partial<LiveHold> = {}): LiveHold => ({
  autonomyHoldId: "h-1",
  autonomousDecisionId: "d-1",
  quoteId: 7,
  holdUntil: "2026-08-24T12:01:00.000Z",
  createdAt: "2026-08-24T12:00:00.000Z",
  quoteSubject: "Quote for Acme renewal",
  summary: "Drafted it and decided to send.",
  secondsRemaining: 60,
  ...over,
});

describe("PendingSendsPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCan.mockReturnValue(true);
    mockCancel.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false, variables: undefined });
    mockHolds.mockReturnValue({ data: [hold()] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * A permanently empty box teaches people to stop looking at the place the
   * warnings appear.
   */
  it("renders nothing when nothing is waiting", () => {
    mockHolds.mockReturnValue({ data: [] });
    const { container } = render(<PendingSendsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows what is about to send and how long is left", () => {
    render(<PendingSendsPanel />);
    expect(screen.getByText("Quote for Acme renewal")).toBeInTheDocument();
    expect(screen.getByText("60s")).toBeInTheDocument();
  });

  it("counts down from the server's number, not the browser clock", () => {
    // A browser with a wrong clock would otherwise show a closed window as open.
    render(<PendingSendsPanel />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText("57s")).toBeInTheDocument();
  });

  it("stops at zero rather than going negative", () => {
    mockHolds.mockReturnValue({ data: [hold({ secondsRemaining: 2 })] });
    render(<PendingSendsPanel />);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("sending…")).toBeInTheDocument();
  });

  it("offers only cancel — there is no approve", () => {
    render(<PendingSendsPanel />);
    expect(screen.getByRole("button", { name: /stop it/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve|send now/i })).not.toBeInTheDocument();
  });

  it("hides the control from someone who cannot cancel", () => {
    mockCan.mockReturnValue(false);
    render(<PendingSendsPanel />);
    expect(screen.queryByRole("button", { name: /stop it/i })).not.toBeInTheDocument();
    // They still see it, because seeing it is what makes someone go and stop it.
    expect(screen.getByText("Quote for Acme renewal")).toBeInTheDocument();
  });

  it("withdraws the control once the window has closed", () => {
    mockHolds.mockReturnValue({ data: [hold({ secondsRemaining: 0 })] });
    render(<PendingSendsPanel />);
    expect(screen.queryByRole("button", { name: /stop it/i })).not.toBeInTheDocument();
  });
});
