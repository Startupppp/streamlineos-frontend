import { fireEvent, render, screen } from "@testing-library/react";

let timerState: Record<string, unknown>;

jest.mock("@/features/hr/attendance/use-attendance-timer", () => ({
  useAttendanceTimer: () => timerState,
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => "allowed",
}));

import { TimerCard } from "@/features/hr/attendance/check-in-button";

function baseTimer(overrides: Record<string, unknown> = {}) {
  return {
    isLoading: false,
    statusFailed: false,
    statusError: null,
    handleRetryStatus: jest.fn(),
    isCheckedIn: false,
    isOnBreak: false,
    isActive: false,
    isInCooldown: false,
    isBlockedDay: false,
    blockedReason: null,
    statusLabel: "Not clocked in",
    cooldownLabel: "0:00",
    sessionTimer: { hours: 0, minutes: 0, seconds: 0 },
    dailyStats: null,
    handleCheckIn: jest.fn(),
    handleCheckOut: jest.fn(),
    handleBreakToggle: jest.fn(),
    punchFailure: null,
    dismissPunchFailure: jest.fn(),
    punchAcknowledgement: 0,
    lastPunchLabel: null,
    isCheckingIn: false,
    isCheckingOut: false,
    isTogglingBreak: false,
    ...overrides,
  };
}

describe("TimerCard punch states", () => {
  it("offers one primary Clock in at a 44px touch target when the day is open", () => {
    timerState = baseTimer();
    render(<TimerCard chrome={false} />);

    const clockIn = screen.getByRole("button", { name: "Clock in" });
    expect(clockIn.className).toContain("min-h-11");
    expect(screen.queryByRole("button", { name: /Clock out/ })).not.toBeInTheDocument();
  });

  it("never offers a second check-in once the day is already open", () => {
    timerState = baseTimer({ isCheckedIn: true, isActive: true });
    render(<TimerCard chrome={false} />);

    expect(screen.queryByRole("button", { name: "Clock in" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clock out" })).toBeInTheDocument();
  });

  it("names the geofence refusal and offers Request WFH as the way out", () => {
    const onRequestWfh = jest.fn();
    timerState = baseTimer({
      punchFailure: {
        kind: "geofence",
        message: "You are outside the Bengaluru office geofence.",
      },
    });
    render(<TimerCard chrome={false} onRequestWfh={onRequestWfh} />);

    expect(screen.getByRole("dialog")).toHaveTextContent(
      /outside the Bengaluru office geofence/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Request WFH" }));
    expect(onRequestWfh).toHaveBeenCalledTimes(1);
  });

  it("does not offer Request WFH for a failure that is not about location", () => {
    timerState = baseTimer({
      punchFailure: { kind: "other", message: "No shift is assigned for today." },
    });
    render(<TimerCard chrome={false} onRequestWfh={jest.fn()} />);

    expect(screen.getByRole("dialog")).toHaveTextContent(/No shift is assigned/);
    expect(screen.queryByRole("button", { name: "Request WFH" })).not.toBeInTheDocument();
  });

  it("shows no dialog while nothing has failed", () => {
    timerState = baseTimer();
    render(<TimerCard chrome={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
