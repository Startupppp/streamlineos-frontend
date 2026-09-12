"use client";

import { render, act } from "@testing-library/react";
import {
  useEventAttendees,
  useCalendarMemberLookup,
  useSetCalendarSourcePreference,
  MEMBER_PICKER_SEARCH_LIMIT,
  MEMBER_PICKER_ROSTER_LIMIT,
} from "@/hooks/api/calendar";
import { useHrCalendarEventsMapped } from "./use-hr-calendar-events";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(),
}));

const mockInvalidateQueries = jest.fn();
const mockMutate = jest.fn();
const mockApiGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiGet(...args),
  },
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: {
      enabled?: boolean;
      queryKey?: readonly unknown[];
      queryFn?: (ctx: { signal: AbortSignal }) => unknown;
    }) => {
      lastQueryEnabled = opts.enabled;
      lastQueryKey = opts.queryKey;
      lastQueryFn = opts.queryFn;
      return { data: undefined, isError: false, error: null };
    }),
    useMutation: jest.fn((opts: { onSuccess?: () => void }) => {
      lastMutationOnSuccess = opts.onSuccess;
      return { mutate: mockMutate, mutateAsync: mockMutate, isPending: false };
    }),
    useQueryClient: jest.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  };
});

const { useCan, useModuleEnabled } = jest.requireMock<{
  useCan: jest.Mock;
  useModuleEnabled: jest.Mock;
}>("@/hooks/api/access");

let lastQueryEnabled: boolean | undefined;
let lastQueryKey: readonly unknown[] | undefined;
let lastQueryFn: ((ctx: { signal: AbortSignal }) => unknown) | undefined;
let lastMutationOnSuccess: (() => void) | undefined;

beforeEach(() => {
  lastQueryEnabled = undefined;
  lastQueryKey = undefined;
  lastQueryFn = undefined;
  lastMutationOnSuccess = undefined;
  mockApiGet.mockReset();
  mockApiGet.mockResolvedValue([]);
  mockInvalidateQueries.mockReset();
  useCan.mockReturnValue(false);
  useModuleEnabled.mockReturnValue(false);
});

// ── useEventAttendees ────────────────────────────────────────────────────────

function AttendeesHook({ eventId }: { eventId: number | null }) {
  useEventAttendees(eventId);
  return null;
}

describe("useEventAttendees — calendar:read gate", () => {
  it("is disabled when useCan('calendar:read') returns false", () => {
    useCan.mockReturnValue(false);
    render(<AttendeesHook eventId={1} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("is enabled when useCan('calendar:read') returns true and eventId is not null", () => {
    useCan.mockReturnValue(true);
    render(<AttendeesHook eventId={42} />);
    expect(lastQueryEnabled).toBe(true);
  });

  it("is disabled when eventId is null even if the permission is granted", () => {
    useCan.mockReturnValue(true);
    render(<AttendeesHook eventId={null} />);
    expect(lastQueryEnabled).toBe(false);
  });
});

// ── useHrCalendarEventsMapped ────────────────────────────────────────────────

function HrHook() {
  useHrCalendarEventsMapped(new Date("2026-09-01"), new Date("2026-09-30"), true);
  return null;
}

describe("useHrCalendarEventsMapped — hr:helpdesk:view + module gate", () => {
  it("does not fire when useCan('hr:helpdesk:view') returns false", () => {
    useCan.mockReturnValue(false);
    useModuleEnabled.mockReturnValue(true);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("does not fire when the hr module is disabled", () => {
    useCan.mockReturnValue(true);
    useModuleEnabled.mockReturnValue(false);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("fires when both permission and module are enabled and hrVisible is true", () => {
    useCan.mockReturnValue(true);
    useModuleEnabled.mockReturnValue(true);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(true);
  });
});

// ── useCalendarMemberLookup key contract ─────────────────────────────────────

function MemberLookupNoSearch() {
  useCalendarMemberLookup();
  return null;
}

function MemberLookupListWithLimit({ limit }: { limit: number }) {
  useCalendarMemberLookup({ limit });
  return null;
}

function MemberLookupWithSearch({ term, limit }: { term: string; limit?: number }) {
  useCalendarMemberLookup({ search: term, limit });
  return null;
}

async function renderAndRunQueryFn(ui: React.ReactElement) {
  render(ui);
  const run = lastQueryFn;
  if (!run) throw new Error("queryFn was not captured");
  await run({ signal: new AbortController().signal });
}

describe("useCalendarMemberLookup — orgMembers-branch limit contract (failing before fix)", () => {
  it("different limits on the no-search branch produce different keys", () => {
    useCan.mockReturnValue(true);
    render(<MemberLookupListWithLimit limit={10} />);
    const keyAt10 = lastQueryKey;
    render(<MemberLookupListWithLimit limit={20} />);
    const keyAt20 = lastQueryKey;
    expect(keyAt10).not.toEqual(keyAt20);
  });

  it("orgMembers key contains the bounded limit", () => {
    useCan.mockReturnValue(true);
    render(<MemberLookupListWithLimit limit={30} />);
    expect(lastQueryKey).toContain(30);
  });

  it("sends limit on the no-search branch request", async () => {
    useCan.mockReturnValue(true);
    await renderAndRunQueryFn(<MemberLookupListWithLimit limit={15} />);
    const params = mockApiGet.mock.calls[0]?.[1] as { limit?: number } | undefined;
    expect(params?.limit).toBe(15);
  });
});

describe("useCalendarMemberLookup — query key contract", () => {
  it("uses the orgMembers key (with the roster limit) when no search term is supplied", () => {
    useCan.mockReturnValue(true);
    render(<MemberLookupNoSearch />);
    expect(lastQueryKey).toEqual(
      platformHierarchyQueryKeys.calendar.orgMembers(MEMBER_PICKER_ROSTER_LIMIT),
    );
  });

  it("does not truncate the roster below what the server would return unsearched", () => {
    useCan.mockReturnValue(true);
    expect(MEMBER_PICKER_ROSTER_LIMIT).toBe(100);
    expect(MEMBER_PICKER_SEARCH_LIMIT).toBeLessThan(MEMBER_PICKER_ROSTER_LIMIT);
  });

  it("keys a search on the term AND the requested limit", () => {
    useCan.mockReturnValue(true);
    render(<MemberLookupWithSearch term="alice" />);
    expect(lastQueryKey).toEqual(
      platformHierarchyQueryKeys.calendar.memberSearch("alice", MEMBER_PICKER_SEARCH_LIMIT),
    );
  });

  it("gives two callers requesting different limits two different keys", () => {
    useCan.mockReturnValue(true);
    render(<MemberLookupWithSearch term="alice" limit={10} />);
    const small = lastQueryKey;
    render(<MemberLookupWithSearch term="alice" limit={50} />);
    const large = lastQueryKey;
    expect(small).not.toEqual(large);
  });

  it("sends the same limit it keyed on", async () => {
    useCan.mockReturnValue(true);
    await renderAndRunQueryFn(<MemberLookupWithSearch term="alice" limit={10} />);
    expect(mockApiGet).toHaveBeenCalledWith(
      "/org/members",
      { search: "alice", limit: 10 },
      expect.anything(),
      expect.anything(),
    );
    expect(lastQueryKey).toEqual(
      platformHierarchyQueryKeys.calendar.memberSearch("alice", 10),
    );
  });

  it("bounds an unspecified search request rather than deferring to the server default", async () => {
    useCan.mockReturnValue(true);
    await renderAndRunQueryFn(<MemberLookupWithSearch term="alice" />);
    const params = mockApiGet.mock.calls[0]?.[1] as { limit?: number } | undefined;
    expect(params?.limit).toBe(MEMBER_PICKER_SEARCH_LIMIT);
    expect(MEMBER_PICKER_SEARCH_LIMIT).toBeLessThan(100);
  });

  it("is disabled when canView is false", () => {
    useCan.mockReturnValue(false);
    render(<MemberLookupNoSearch />);
    expect(lastQueryEnabled).toBe(false);
  });
});

// ── useSetCalendarSourcePreference invalidation ──────────────────────────────

function SourcePreferenceHook() {
  useSetCalendarSourcePreference();
  return null;
}

describe("useSetCalendarSourcePreference — targeted sources invalidation", () => {
  it("invalidates only the sources key, not calendar.all", () => {
    useCan.mockReturnValue(true);
    render(<SourcePreferenceHook />);
    act(() => {
      lastMutationOnSuccess?.();
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: platformHierarchyQueryKeys.calendar.sources(),
      }),
    );
    expect(mockInvalidateQueries).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: platformHierarchyQueryKeys.calendar.all,
      }),
    );
  });
});
