import {
  KB_PAGE_STATUSES,
  KB_PAGE_TRUST_STATES,
  kbAnalyticsPagesContract,
} from "@/hooks/api/kb/kb-analytics-schema";

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

describe("kbAnalyticsPagesContract — the page vocabulary, matched to the backend", () => {
  it("accepts every status kb_pages.status is typed to hold, so the enum below rejects on vocabulary and not on coverage", () => {
    for (const status of KB_PAGE_STATUSES) {
      const result = kbAnalyticsPagesContract.safeParse({
        ...BASE_PAYLOAD,
        data: [{ ...BASE_PAGE_ITEM, status }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts every trust state kb_pages.trust_state is typed to hold", () => {
    for (const trustState of KB_PAGE_TRUST_STATES) {
      const result = kbAnalyticsPagesContract.safeParse({
        ...BASE_PAYLOAD,
        data: [{ ...BASE_PAGE_ITEM, trustState }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a status outside that set, because KbPageAnalyticsRow declares the same four and a free string there type-checked against a union it could violate", () => {
    const result = kbAnalyticsPagesContract.safeParse({
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, status: "pending_review" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a trust state outside that set", () => {
    const result = kbAnalyticsPagesContract.safeParse({
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, trustState: "partially_verified" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload where status is not a string at all", () => {
    const result = kbAnalyticsPagesContract.safeParse({
      ...BASE_PAYLOAD,
      data: [{ ...BASE_PAGE_ITEM, status: 42 }],
    });
    expect(result.success).toBe(false);
  });
});
