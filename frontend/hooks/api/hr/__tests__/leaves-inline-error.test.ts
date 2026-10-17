import { useQuery } from "@tanstack/react-query";
import { useHrLeaveContext, useLeavePolicy, useHrLeavesThisWeek, useHrMyLeaveRequests, useHrHolidaysForCalendar, useLeaveTypesAdmin } from "@/hooks/api/hr/leaves";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { version: 7 } })),
}));
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
  })),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockedQuery = useQuery as jest.Mock;

type CapturedOptions = { throwOnError?: unknown; enabled: boolean };

function capture(fn: () => void): CapturedOptions {
  fn();
  return mockedQuery.mock.calls[mockedQuery.mock.calls.length - 1][0] as CapturedOptions;
}

describe("leave hooks inline error policy", () => {
  it("useHrLeaveContext carries throwOnError false so errors stay inline", () => {
    const opts = capture(() => useHrLeaveContext());
    expect(opts.throwOnError).toBe(false);
  });

  it("useHrLeaveContext is enabled when access is available (paired positive)", () => {
    const opts = capture(() => useHrLeaveContext());
    expect(opts.enabled).toBe(true);
  });

  it("useLeavePolicy carries throwOnError false", () => {
    const opts = capture(() => useLeavePolicy());
    expect(opts.throwOnError).toBe(false);
  });

  it("useHrLeavesThisWeek carries throwOnError false", () => {
    const opts = capture(() => useHrLeavesThisWeek());
    expect(opts.throwOnError).toBe(false);
  });

  it("useHrMyLeaveRequests carries throwOnError false", () => {
    const opts = capture(() => useHrMyLeaveRequests());
    expect(opts.throwOnError).toBe(false);
  });

  it("useHrHolidaysForCalendar carries throwOnError false", () => {
    const opts = capture(() => useHrHolidaysForCalendar({ year: 2026, month: 10 }));
    expect(opts.throwOnError).toBe(false);
  });

  it("useLeaveTypesAdmin carries throwOnError false", () => {
    const opts = capture(() => useLeaveTypesAdmin());
    expect(opts.throwOnError).toBe(false);
  });
});
