import type { BuildApprovalsCreateApprovalResponse } from "@/contracts/build-contracts.generated";
import type { InfiniteData } from "@tanstack/react-query";

type ApprovalListPage = {
  data: BuildApprovalsCreateApprovalResponse[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function isInfiniteApprovalPage(v: unknown): v is InfiniteData<ApprovalListPage> {
  return typeof v === "object" && v !== null && "pages" in v && Array.isArray((v as Record<string, unknown>).pages);
}

function isFlatApprovalPage(v: unknown): v is ApprovalListPage {
  return (
    typeof v === "object" &&
    v !== null &&
    "data" in v &&
    Array.isArray((v as Record<string, unknown>).data) &&
    !("pages" in v)
  );
}

function patchInInfinite(updated: BuildApprovalsCreateApprovalResponse) {
  return (old: unknown): unknown => {
    if (!isInfiniteApprovalPage(old)) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((item) => (item.id === updated.id ? updated : item)),
      })),
    };
  };
}

function patchInFlat(updated: BuildApprovalsCreateApprovalResponse) {
  return (old: unknown): unknown => {
    if (!isFlatApprovalPage(old)) return old;
    return { ...old, data: old.data.map((item) => (item.id === updated.id ? updated : item)) };
  };
}

const PAGINATION = { limit: 25, hasMore: false, nextCursor: null };

const PENDING: BuildApprovalsCreateApprovalResponse = {
  id: 7,
  revision: 1,
  orgId: "org-1",
  projectId: 3,
  entityType: "task",
  entityId: 10,
  title: "Deploy review",
  reason: null,
  requestedById: "user-1",
  approverMembershipId: 22,
  status: "pending",
  level: 1,
  dueAt: null,
  decisionComment: null,
  decidedAt: null,
  createdBy: "user-1",
  deletedAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const APPROVED: BuildApprovalsCreateApprovalResponse = { ...PENDING, status: "approved", revision: 2 };

describe("B-076 — patchInFlat patches the flat {data,pagination} shape used by useProjectApprovalsPage", () => {
  it("replaces the matching item in the flat data array", () => {
    const page: ApprovalListPage = { data: [PENDING], pagination: PAGINATION };
    const result = patchInFlat(APPROVED)(page) as ApprovalListPage;
    expect(result.data[0].status).toBe("approved");
    expect(result.data[0].revision).toBe(2);
  });

  it("leaves unrelated items untouched in the flat array", () => {
    const OTHER: BuildApprovalsCreateApprovalResponse = { ...PENDING, id: 99, title: "Other" };
    const page: ApprovalListPage = { data: [PENDING, OTHER], pagination: PAGINATION };
    const result = patchInFlat(APPROVED)(page) as ApprovalListPage;
    expect(result.data[0].status).toBe("approved");
    expect(result.data[1].id).toBe(99);
  });

  it("returns old unchanged when the shape is InfiniteData rather than a flat page", () => {
    const infinite: InfiniteData<ApprovalListPage> = {
      pages: [{ data: [PENDING], pagination: PAGINATION }],
      pageParams: [null],
    };
    const result = patchInFlat(APPROVED)(infinite);
    expect(result).toBe(infinite);
  });
});

describe("B-076 — patchInInfinite still handles the InfiniteData shape used by useProjectApprovals", () => {
  it("replaces the matching item inside the nested pages array", () => {
    const infinite: InfiniteData<ApprovalListPage> = {
      pages: [{ data: [PENDING], pagination: PAGINATION }],
      pageParams: [null],
    };
    const result = patchInInfinite(APPROVED)(infinite) as InfiniteData<ApprovalListPage>;
    expect(result.pages[0].data[0].status).toBe("approved");
  });

  it("returns old unchanged when the shape is a flat page rather than InfiniteData", () => {
    const page: ApprovalListPage = { data: [PENDING], pagination: PAGINATION };
    const result = patchInInfinite(APPROVED)(page);
    expect(result).toBe(page);
  });
});
