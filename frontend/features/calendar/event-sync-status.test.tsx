import { render, screen, fireEvent } from "@testing-library/react";
import { EventSyncStatus } from "./event-sync-status";
import type { EventSyncStatusResponse } from "@/hooks/api/calendar";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "Unknown error"),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: (string | undefined | false | null)[]) =>
    args.filter(Boolean).join(" "),
}));

jest.mock("@/lib/design-tokens", () => ({
  statusToneClasses: () => ({
    surface: "bg-status-danger-surface",
    ink: "text-status-danger-ink",
    rule: "border-status-danger-rule",
    fill: "bg-status-danger-fill",
    inkStrong: "text-status-danger-ink-strong",
    fillHover: "hover:bg-status-danger-fill-hover",
  }),
}));

jest.mock("@/hooks/api/calendar", () => ({
  useEventSyncStatus: jest.fn(),
  useRetryEventSync: jest.fn(),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    isPending,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    isPending?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={isPending ?? false}>
      {children}
    </button>
  ),
}));

import React from "react";

type CalendarMock = {
  useEventSyncStatus: jest.Mock;
  useRetryEventSync: jest.Mock;
};

type SonerMock = { toast: { error: jest.Mock; success: jest.Mock } };

function getCalendarMock() {
  return jest.requireMock<CalendarMock>("@/hooks/api/calendar");
}

function getSonerMock() {
  return jest.requireMock<SonerMock>("sonner");
}

const defaultMutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getCalendarMock().useRetryEventSync.mockReturnValue({
    mutate: defaultMutate,
    isPending: false,
  });
});

function makeStatus(
  overrides: Partial<EventSyncStatusResponse> = {},
): { data: EventSyncStatusResponse } {
  return {
    data: {
      status: "synced",
      attemptCount: 0,
      lastError: null,
      operation: null,
      queuedAt: null,
      processedAt: null,
      retryable: false,
      failureKind: null,
      repairAction: "none",
      ...overrides,
    },
  };
}

describe("EventSyncStatus — renders nothing for settled states", () => {
  it("renders nothing when status is synced", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "synced" }),
    );
    const { container } = render(<EventSyncStatus eventId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when status is not_synced", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "not_synced" }),
    );
    const { container } = render(<EventSyncStatus eventId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when data is undefined", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue({ data: undefined });
    const { container } = render(<EventSyncStatus eventId={1} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("EventSyncStatus — in-progress states", () => {
  it("shows muted syncing message for pending", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "pending" }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/syncing to your calendar/i)).toBeInTheDocument();
  });

  it("shows muted syncing message for in_flight", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "in_flight" }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/syncing to your calendar/i)).toBeInTheDocument();
  });
});

describe("EventSyncStatus — failed state", () => {
  it("renders failure state with attempt count", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 3, retryable: false }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/3 attempts/i)).toBeInTheDocument();
  });

  it("renders correctly for 1 attempt (singular)", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 1, retryable: false }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/1 attempt/)).toBeInTheDocument();
    expect(screen.queryByText(/1 attempts/)).toBeNull();
  });

  it("shows Retry button only when retryable is true", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 5, retryable: true }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByRole("button", { name: /retry sync/i })).toBeInTheDocument();
  });

  it("hides Retry button when retryable is false", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 5, retryable: false }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.queryByRole("button", { name: /retry sync/i })).toBeNull();
  });

  it("directs authorization failures to reconnect instead of retrying", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({
        status: "failed",
        failureKind: "auth",
        repairAction: "reconnect",
        retryable: false,
      }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/reconnect this account/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry sync/i })).toBeNull();
  });

  it("directs capability failures to change the event or account", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({
        status: "failed",
        failureKind: "capability",
        repairAction: "change_event",
        retryable: false,
      }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/cannot represent the requested change/i)).toBeInTheDocument();
  });

  it("directs provider version conflicts to reload before choosing a version", () => {
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({
        status: "failed",
        failureKind: "conflict",
        repairAction: "review_conflict",
        retryable: false,
      }),
    );
    render(<EventSyncStatus eventId={1} />);
    expect(screen.getByText(/provider copy changed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry sync/i })).toBeNull();
  });
});

describe("EventSyncStatus — retry mutation", () => {
  it("calls mutate with the eventId when Retry is clicked", () => {
    const mutate = jest.fn();
    getCalendarMock().useRetryEventSync.mockReturnValue({
      mutate,
      isPending: false,
    });
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 1, retryable: true }),
    );
    render(<EventSyncStatus eventId={42} />);
    fireEvent.click(screen.getByRole("button", { name: /retry sync/i }));
    expect(mutate).toHaveBeenCalledWith(
      { eventId: 42 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("shows toast.success when retry succeeds", () => {
    const mutate = jest.fn(
      (_v: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
    );
    getCalendarMock().useRetryEventSync.mockReturnValue({
      mutate,
      isPending: false,
    });
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 1, retryable: true }),
    );
    render(<EventSyncStatus eventId={42} />);
    fireEvent.click(screen.getByRole("button", { name: /retry sync/i }));
    expect(getSonerMock().toast.success).toHaveBeenCalledWith("Sync re-queued");
  });

  it("shows toast.error via getErrorMessage when retry fails", () => {
    const error = new Error("Queue full");
    const mutate = jest.fn(
      (_v: unknown, opts?: { onError?: (e: Error) => void }) =>
        opts?.onError?.(error),
    );
    getCalendarMock().useRetryEventSync.mockReturnValue({
      mutate,
      isPending: false,
    });
    getCalendarMock().useEventSyncStatus.mockReturnValue(
      makeStatus({ status: "failed", attemptCount: 1, retryable: true }),
    );
    render(<EventSyncStatus eventId={42} />);
    fireEvent.click(screen.getByRole("button", { name: /retry sync/i }));
    expect(getSonerMock().toast.error).toHaveBeenCalledWith("Queue full");
  });
});
