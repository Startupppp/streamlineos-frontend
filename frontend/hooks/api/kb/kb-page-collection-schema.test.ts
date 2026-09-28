import {
  kbPageCollectionItemSchema,
  kbPageCollectionResponseSchema,
} from "./kb-page-collection-schema";

function wireItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Runbook",
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: 7,
    parentPageId: null,
    status: "published",
    visibility: "org",
    contentType: "rich-text",
    trustState: "verified",
    ownerMembershipId: 42,
    ownerUserId: "11111111-2222-3333-4444-555555555555",
    createdById: "11111111-2222-3333-4444-555555555555",
    createdByMembershipId: 42,
    lastEditedById: "11111111-2222-3333-4444-555555555555",
    lastEditedByMembershipId: 42,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 3,
    aclRevision: 1,
    sharedBy: null,
    ...overrides,
  };
}

describe("kbPageCollectionItemSchema — the owner identity the Owner column renders", () => {
  it("retains ownerUserId, the only field the Owner column can resolve a display name from", () => {
    const parsed = kbPageCollectionItemSchema.parse(wireItem());

    expect(parsed.ownerUserId).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("retains a null ownerUserId as null rather than dropping the key, so an unowned page is distinguishable from an unparsed one", () => {
    const parsed = kbPageCollectionItemSchema.parse(
      wireItem({ ownerUserId: null }),
    );

    expect(parsed.ownerUserId).toBeNull();
    expect("ownerUserId" in parsed).toBe(true);
  });

  it("retains ownerMembershipId, which the owner-missing badge reads independently of ownerUserId", () => {
    const parsed = kbPageCollectionItemSchema.parse(wireItem());

    expect(parsed.ownerMembershipId).toBe(42);
  });

  it("rejects a numeric ownerUserId rather than coercing it, because a coerced id would render as a visible identifier in the Owner column", () => {
    expect(() =>
      kbPageCollectionItemSchema.parse(wireItem({ ownerUserId: 42 })),
    ).toThrow();
  });
});

describe("kbPageCollectionResponseSchema — the cursor envelope the URL-backed pager depends on", () => {
  it("retains pagination.nextCursor so the advanced cursor can be written into the URL", () => {
    const parsed = kbPageCollectionResponseSchema.parse({
      data: [wireItem()],
      pagination: { limit: 50, hasMore: true, nextCursor: "cursor-page-two" },
      facets: null,
      boundedCount: { count: 51, isExact: false },
    });

    expect(parsed.pagination.nextCursor).toBe("cursor-page-two");
    expect(parsed.pagination.hasMore).toBe(true);
  });

  it("retains a null nextCursor on the last page so the pager stops instead of writing the string null into the URL", () => {
    const parsed = kbPageCollectionResponseSchema.parse({
      data: [wireItem()],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
      facets: null,
      boundedCount: { count: 1, isExact: true },
    });

    expect(parsed.pagination.nextCursor).toBeNull();
  });
});
