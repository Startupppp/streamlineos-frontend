import {
  updateRowContract,
  cursorPaginationContract,
  updatePageContract,
} from "./project-updates-schema";

const minimalRow = {
  id: 1,
  orgId: "org-abc",
  projectId: 7,
  authorMembershipId: 3,
  body: "Sprint review went well.",
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-10T12:00:00.000Z",
  deletedAt: null,
};

describe("updateRowContract", () => {
  it("accepts a valid update row so a backend response with all required fields parses cleanly", () => {
    expect(updateRowContract.safeParse(minimalRow).success).toBe(true);
  });

  it("rejects a row whose id is a string instead of a number, catching the most common numeric-field type error", () => {
    expect(updateRowContract.safeParse({ ...minimalRow, id: "1" }).success).toBe(false);
  });

  it("rejects a row where authorMembershipId is a string because a membership ID arriving as a string would silently fail the display name lookup", () => {
    expect(
      updateRowContract.safeParse({ ...minimalRow, authorMembershipId: "3" }).success,
    ).toBe(false);
  });

  it("accepts a row whose deletedAt is a date string so soft-deleted updates can be decoded without error", () => {
    expect(
      updateRowContract.safeParse({
        ...minimalRow,
        deletedAt: "2026-09-11T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a row missing body so a truncated response cannot decode as a valid update and silently render blank", () => {
    const { body: _omit, ...withoutBody } = minimalRow;
    expect(updateRowContract.safeParse(withoutBody).success).toBe(false);
  });

  it("rejects a row missing createdAt because the feed sorts by createdAt and a missing value would produce a broken date display", () => {
    const { createdAt: _omit, ...withoutCreatedAt } = minimalRow;
    expect(updateRowContract.safeParse(withoutCreatedAt).success).toBe(false);
  });
});

describe("cursorPaginationContract", () => {
  it("accepts the standard pagination envelope so a page result with all three fields parses", () => {
    expect(
      cursorPaginationContract.safeParse({
        limit: 20,
        hasMore: true,
        nextCursor: "cursor-xyz",
      }).success,
    ).toBe(true);
  });

  it("accepts a null nextCursor so the last page where the cursor is absent decodes correctly", () => {
    expect(
      cursorPaginationContract.safeParse({ limit: 20, hasMore: false, nextCursor: null }).success,
    ).toBe(true);
  });

  it("rejects hasMore sent as a string because a truthy string would make infinite-scroll continue forever", () => {
    expect(
      cursorPaginationContract.safeParse({
        limit: 20,
        hasMore: "true",
        nextCursor: null,
      }).success,
    ).toBe(false);
  });

  it("rejects a limit sent as a string because the limit field is used to infer page size and a string bypasses the check", () => {
    expect(
      cursorPaginationContract.safeParse({
        limit: "20",
        hasMore: false,
        nextCursor: null,
      }).success,
    ).toBe(false);
  });
});

describe("updatePageContract", () => {
  it("accepts a full page envelope with a row and cursor so the standard backend response decodes cleanly", () => {
    const page = {
      data: [minimalRow],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    };
    expect(updatePageContract.safeParse(page).success).toBe(true);
  });

  it("accepts an empty page so the first-load state with no updates does not crash the contract", () => {
    const page = {
      data: [],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    };
    expect(updatePageContract.safeParse(page).success).toBe(true);
  });

  it("rejects an array payload without a pagination envelope so a legacy flat-array response is caught before the infinite-query merge", () => {
    expect(updatePageContract.safeParse([minimalRow]).success).toBe(false);
  });

  it("rejects a page where a row inside data fails the row contract so a single malformed row does not silently produce an undefined entry in the feed", () => {
    const badRow = { ...minimalRow, id: "not-a-number" };
    const page = {
      data: [badRow],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    };
    expect(updatePageContract.safeParse(page).success).toBe(false);
  });

  it("passes the nextCursor through so the infinite query can request the next page correctly", () => {
    const page = {
      data: [minimalRow],
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-abc" },
    };
    const result = updatePageContract.safeParse(page);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.pagination.nextCursor).toBe("cursor-abc");
  });
});
