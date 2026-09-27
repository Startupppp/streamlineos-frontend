import { normalizeTemplateListResponse } from "./templates";

const template = {
  id: 1,
  orgId: "org-1",
  name: "Starter",
  description: null,
  category: "engineering",
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-09-27T00:00:00.000Z",
};

describe("normalizeTemplateListResponse", () => {
  it("wraps a legacy array as a completed page", () => {
    expect(normalizeTemplateListResponse([template])).toEqual({
      data: [template],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });
  });

  it("preserves cursor pagination", () => {
    const page = {
      data: [template],
      pagination: { limit: 50, hasMore: true, nextCursor: "next" },
    };
    expect(normalizeTemplateListResponse(page)).toBe(page);
  });
});
