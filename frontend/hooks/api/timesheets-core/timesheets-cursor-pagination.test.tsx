import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useApprovals } from "./approvals";
import { useAuditEvents } from "./audit";
import type { CursorPage, TimesheetPeriod } from "@/features/timesheets/types";
import type { AuditEvent } from "@/features/timesheets/audit-types";

const mockGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeApprovalsPage(nextCursor: string | null): CursorPage<TimesheetPeriod> {
  return {
    data: [
      {
        id: 1,
        orgId: "org-1",
        userMembershipId: 7,
        status: "SUBMITTED",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-07",
        totalHours: "40",
        billableHours: "32",
        nonBillableHours: "8",
        submittedAt: "2026-01-08T09:00:00.000Z",
        approvedAt: null,
        rejectedAt: null,
        lockedAt: null,
        currentApproverMembershipId: null,
        approvalRoute: null,
        approvalDueAt: null,
        approvalEscalatedAt: null,
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-08T09:00:00.000Z",
        user: { membershipId: 7, name: "Alice", email: "alice@example.com" },
      },
    ],
    pagination: { limit: 25, nextCursor, hasMore: nextCursor !== null },
  };
}

function makeAuditPage(nextCursor: string | null): CursorPage<AuditEvent> {
  return {
    data: [
      {
        id: 1,
        action: "entry.created",
        entityType: "entry",
        entityId: "42",
        actorMembershipId: 7,
        actorName: "Alice",
        before: null,
        after: null,
        createdAt: "2026-01-08T10:00:00Z",
        reason: null,
      } satisfies AuditEvent,
    ],
    pagination: { limit: 20, nextCursor, hasMore: nextCursor !== null },
  };
}

describe("useApprovals cursor pagination", () => {
  beforeEach(() => mockGet.mockReset());

  it("page 1 sends no cursor param", async () => {
    const qc = makeQc();
    const page1 = makeApprovalsPage("tok1");
    mockGet.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useApprovals({ status: "SUBMITTED" }), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [path, params] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/timesheets/approvals");
    expect(params).not.toHaveProperty("cursor");
    expect(result.current.data?.pages[0]?.data).toHaveLength(1);
  });

  it("page 2 sends nextCursor from page 1", async () => {
    const qc = makeQc();
    const page1 = makeApprovalsPage("tok2");
    const page2 = makeApprovalsPage(null);
    mockGet
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useApprovals({ status: "SUBMITTED" }), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    void result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    const [, paramsPage2] = mockGet.mock.calls[1] as [string, Record<string, unknown>];
    expect(paramsPage2).toHaveProperty("cursor", "tok2");
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("useAuditEvents cursor pagination", () => {
  beforeEach(() => mockGet.mockReset());

  it("page 1 sends no cursor param", async () => {
    const qc = makeQc();
    const page1 = makeAuditPage("tok_audit_1");
    mockGet.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useAuditEvents({ action: "entry.created" }), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [path, params] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/timesheets/audit");
    expect(params).not.toHaveProperty("cursor");
    expect(result.current.data?.pages[0]?.data[0]?.action).toBe("entry.created");
  });

  it("page 2 sends nextCursor from page 1", async () => {
    const qc = makeQc();
    const page1 = makeAuditPage("tok_audit_2");
    const page2 = makeAuditPage(null);
    mockGet
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useAuditEvents({}), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    void result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    const [, paramsPage2] = mockGet.mock.calls[1] as [string, Record<string, unknown>];
    expect(paramsPage2).toHaveProperty("cursor", "tok_audit_2");
    expect(result.current.hasNextPage).toBe(false);
  });
});
