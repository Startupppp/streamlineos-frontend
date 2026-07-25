import {
  isRecruitmentListResponse,
  normalizeRecruitmentList,
  unwrapRecruitmentItems,
} from "./list-response";

describe("recruitment list-response helpers", () => {
  it("detects paginated list responses", () => {
    expect(
      isRecruitmentListResponse({
        items: [{ id: 1 }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    ).toBe(true);
    expect(isRecruitmentListResponse([{ id: 1 }])).toBe(false);
    expect(isRecruitmentListResponse(null)).toBe(false);
  });

  it("unwraps items from paginated backend payloads", () => {
    const items = unwrapRecruitmentItems({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(items).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("preserves bare arrays for backward compatibility", () => {
    const items = unwrapRecruitmentItems([{ id: 9 }]);
    expect(items).toEqual([{ id: 9 }]);
  });

  it("normalizes null/undefined to empty list", () => {
    expect(normalizeRecruitmentList(undefined).items).toEqual([]);
    expect(normalizeRecruitmentList(null).total).toBe(0);
  });
});
