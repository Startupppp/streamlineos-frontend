import { kbAnalyticsPagesContract } from "@/hooks/api/kb/kb-analytics-schema";

const BASE_PAGE_ITEM = {
  id: 1,
  title: "Intro to product",
  status: "published",
  trustState: "verified",
  updatedAt: "2025-06-01T12:00:00.000Z",
  uniqueViewers: 42,
  commentCount: 3,
  versionCount: 7,
};

const BASE_PAYLOAD = {
  data: [BASE_PAGE_ITEM],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
};

describe("kbAnalyticsPagesContract — status and trustState are open strings", () => {
  it("accepts known status and trustState values", () => {
    const result = kbAnalyticsPagesContract.safeParse(BASE_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it("accepts an unknown status without throwing a CONTRACT_VIOLATION", () => {
    const payload = {
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, status: "pending_review" }],
    };
    const result = kbAnalyticsPagesContract.safeParse(payload);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.data[0]?.status).toBe("pending_review");
  });

  it("accepts an unknown trustState without throwing a CONTRACT_VIOLATION", () => {
    const payload = {
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, trustState: "partially_verified" }],
    };
    const result = kbAnalyticsPagesContract.safeParse(payload);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.data[0]?.trustState).toBe("partially_verified");
  });

  it("rejects a payload where status is not a string", () => {
    const payload = {
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, status: 42 }],
    };
    const result = kbAnalyticsPagesContract.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
