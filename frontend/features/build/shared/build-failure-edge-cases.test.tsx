import { render, screen } from "@testing-library/react";
import { BuildOfflineNotice } from "./build-offline-notice";
import { getErrorStateForStatus } from "@/components/shared/error-state";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock("@/lib/format-relative-time", () => ({
  formatRelativeTime: (d: Date) => `at ${d.toISOString().slice(0, 10)}`,
}));

import { useOnlineStatus } from "@/hooks/common/use-online-status";
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;

describe("BuildOfflineNotice — offline/resume behavior", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders an offline notice when the user is offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<BuildOfflineNotice />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("does not render when the user is online", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    render(<BuildOfflineNotice />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows last-loaded timestamp when dataUpdatedAt is provided and user is offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    const ts = new Date("2026-10-03T10:00:00Z").getTime();
    render(<BuildOfflineNotice dataUpdatedAt={ts} />);
    expect(screen.getByText(/2026-10-03/)).toBeInTheDocument();
  });

  it("shows generic 'loaded earlier' when dataUpdatedAt is zero and user is offline", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<BuildOfflineNotice dataUpdatedAt={0} />);
    expect(screen.getByText(/loaded earlier/i)).toBeInTheDocument();
  });
});

describe("Build edge-case failure mode stubs", () => {
  it("permission-loss mid-session: a 403 response carries a role=alert announcement", () => {
    const denied = new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/build/tickets");
    const state = getErrorStateForStatus(denied);
    expect(state.icon).toBe("denied");
    expect(state.retryable).toBe(false);
    expect(state.title).toBe("Permission denied");
  });

  it("CAS conflict (409) maps to non-retryable conflict state", () => {
    const conflict = new ApiError("Conflict", 409, "CONFLICT", {}, "/build/tickets/1");
    const state = getErrorStateForStatus(conflict);
    expect(state.icon).toBe("conflict");
    expect(state.retryable).toBe(false);
    expect(state.description).toMatch(/someone else updated/i);
  });

  it("rate limit (429) maps to generic retryable state", () => {
    const rateLimit = new ApiError("Too Many Requests", 429, "RATE_LIMITED", {}, "/build");
    const state = getErrorStateForStatus(rateLimit);
    expect(state.retryable).toBe(true);
  });

  it("503 service unavailable maps to retryable unavailable state", () => {
    const unavailable = new ApiError("Service Unavailable", 503, "UNAVAILABLE", {}, "/build");
    const state = getErrorStateForStatus(unavailable);
    expect(state.icon).toBe("unavailable");
    expect(state.retryable).toBe(true);
  });
});
