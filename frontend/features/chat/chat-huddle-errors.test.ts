import { toast } from "sonner";
import { reportHuddleStartError } from "@/hooks/api/chat-huddle-errors";
import { ApiError } from "@/lib/api-envelope";
import type { HuddleAlternative } from "@/hooks/api/chat-schema";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  },
}));

const mockToastError = toast.error as jest.Mock;

function apiError(code: string, details?: Record<string, unknown>) {
  return new ApiError("api error", 412, code, details ?? {});
}

const GOOGLE_ALTERNATIVE: HuddleAlternative = {
  connectionId: 1,
  provider: "google_meet",
  label: "me@gmail.com",
};

describe("reportHuddleStartError — HUDDLE_TEAMS_UNSUPPORTED", () => {
  beforeEach(() => mockToastError.mockClear());

  it("shows a connect-account action when there are no alternatives, because the only fix is adding an account", () => {
    const retry = jest.fn();

    reportHuddleStartError(apiError("HUDDLE_TEAMS_UNSUPPORTED"), retry);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Microsoft Teams for Business is required"),
      expect.objectContaining({
        action: expect.objectContaining({ label: "Connect a calendar account" }),
      }),
    );
  });

  it("offers a start-with-alternative action when a Google account is available, so the user does not have to leave the page", () => {
    const retry = jest.fn();
    const retryWith = jest.fn();
    const err = apiError("HUDDLE_TEAMS_UNSUPPORTED", { alternatives: [GOOGLE_ALTERNATIVE] });

    reportHuddleStartError(err, retry, retryWith);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Microsoft Teams for Business is required"),
      expect.objectContaining({
        action: expect.objectContaining({ label: "Start with Google instead" }),
      }),
    );
    const { action } = mockToastError.mock.calls[0][1] as { action: { onClick: () => void } };
    action.onClick();
    expect(retryWith).toHaveBeenCalledWith(1);
  });

  it("falls back to connect-account action when retryWithConnection is not provided, even if alternatives exist", () => {
    const retry = jest.fn();
    const err = apiError("HUDDLE_TEAMS_UNSUPPORTED", { alternatives: [GOOGLE_ALTERNATIVE] });

    reportHuddleStartError(err, retry);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        action: expect.objectContaining({ label: "Connect a calendar account" }),
      }),
    );
  });
});

describe("reportHuddleStartError — HUDDLE_RECONNECT with alternatives", () => {
  beforeEach(() => mockToastError.mockClear());

  it("still shows the reconnect action even when alternatives exist, because reconnect is not yet handled with the alternative path", () => {
    const retry = jest.fn();
    const err = apiError("HUDDLE_RECONNECT", {
      connectPath: "/calendar?accounts=1",
      provider: "microsoft_teams",
      alternatives: [GOOGLE_ALTERNATIVE],
    });

    reportHuddleStartError(err, retry);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Reconnect"),
      expect.objectContaining({
        action: expect.objectContaining({ label: expect.stringContaining("Reconnect") }),
      }),
    );
  });
});

describe("reportHuddleStartError — other codes", () => {
  beforeEach(() => mockToastError.mockClear());

  it("HUDDLE_PROVIDER_UNAVAILABLE shows a retry action", () => {
    const retry = jest.fn();

    reportHuddleStartError(apiError("HUDDLE_PROVIDER_UNAVAILABLE"), retry);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        action: expect.objectContaining({ label: "Try again" }),
      }),
    );
    const { action } = mockToastError.mock.calls[0][1] as { action: { onClick: () => void } };
    action.onClick();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("HUDDLE_NO_CONNECTION shows a connect-calendar action", () => {
    reportHuddleStartError(apiError("HUDDLE_NO_CONNECTION"), jest.fn());

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Connect"),
      expect.objectContaining({
        action: expect.objectContaining({ label: "Connect calendar" }),
      }),
    );
  });

  it("unknown errors show the message string from the error", () => {
    reportHuddleStartError(new Error("Something went wrong"), jest.fn());

    expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
  });
});
