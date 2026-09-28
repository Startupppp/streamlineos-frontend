import {
  KB_PAGE_COLLECTION_QUERY_FIELDS,
  buildKbPageCollectionQueryParams,
} from "./page-collection";
import { kbPageCollectionResponseSchema } from "./kb-page-collection-schema";

const BACKEND_FIXTURE_FIELDS = [
  "q",
  "spaceId",
  "projectId",
  "owner",
  "ownerMembershipId",
  "sharedWithMe",
  "status",
  "verified",
  "deleted",
  "sort",
  "cursor",
  "limit",
  "facets",
] as const;

const WIRE_FIXTURE = {
  data: [
    {
      id: 1,
      title: "Onboarding",
      icon: null,
      coverImage: null,
      spaceId: null,
      projectId: null,
      parentPageId: null,
      status: "published",
      visibility: "org",
      contentType: "rich-text",
      trustState: "verified",
      ownerMembershipId: 1,
      ownerUserId: "user-1",
      createdById: "user-1",
      createdByMembershipId: 1,
      lastEditedById: "user-1",
      lastEditedByMembershipId: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
      nextReviewAt: null,
      verifiedUntil: null,
      contentRevision: 1,
      aclRevision: 1,
      sharedBy: null,
    },
  ],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
  facets: null,
  boundedCount: { count: 1, isExact: true },
};

describe("KB page collection — response contract parity (FE-28)", () => {
  it("parses a wire payload including every backend-projected field without error, so a missing FE declaration fails here rather than silently rendering empty", () => {
    expect(kbPageCollectionResponseSchema.safeParse(WIRE_FIXTURE).success).toBe(true);
  });

  it("the parsed result includes boundedCount, confirming the FE contract declares the field rather than stripping it", () => {
    const parsed = kbPageCollectionResponseSchema.parse(WIRE_FIXTURE);
    expect(parsed.boundedCount).toEqual({ count: 1, isExact: true });
  });

  it("every backend item field is present in the parsed result, so a field added to the backend schema but not the frontend is caught at this boundary", () => {
    const parsed = kbPageCollectionResponseSchema.parse(WIRE_FIXTURE);
    const item = parsed.data[0];
    const backendProjectedFields = [
      "id", "title", "icon", "coverImage", "spaceId", "projectId",
      "parentPageId", "status", "visibility", "contentType", "trustState",
      "ownerMembershipId", "ownerUserId", "createdById", "createdByMembershipId",
      "lastEditedById", "lastEditedByMembershipId", "createdAt", "updatedAt",
      "deletedAt", "nextReviewAt", "verifiedUntil", "contentRevision", "aclRevision",
      "sharedBy",
    ] as const;
    for (const field of backendProjectedFields) {
      expect(item).toHaveProperty(field);
    }
  });

  it("decodes a populated facets object including its exactness flag, because every fixture here sends facets: null and so covered none of the facet shape at all", () => {
    const faceted = {
      ...WIRE_FIXTURE,
      facets: {
        status: [{ value: "published", count: 4 }],
        space: [{ spaceId: 7, count: 3 }],
        owner: [{ ownerMembershipId: 11, count: 4 }],
        isExact: false,
      },
    };

    const parsed = kbPageCollectionResponseSchema.parse(faceted);

    expect(parsed.facets?.isExact).toBe(false);
    expect(parsed.facets?.status).toEqual([{ value: "published", count: 4 }]);
  });

  it("rejects a facets object with no exactness flag, so a backend that stopped sending it fails the contract instead of decoding to undefined and presenting a sampled distribution as a census", () => {
    const withoutFlag = {
      ...WIRE_FIXTURE,
      facets: {
        status: [{ value: "published", count: 4 }],
        space: [{ spaceId: 7, count: 3 }],
        owner: [{ ownerMembershipId: 11, count: 4 }],
      },
    };

    expect(kbPageCollectionResponseSchema.safeParse(withoutFlag).success).toBe(
      false,
    );
  });
});

describe("KB_PAGE_COLLECTION_QUERY_FIELDS — the cross-repo half of the collection query fixture", () => {
  it("matches the field list pinned on the backend (backend/src/modules/kb/core/collection/knowledge-collection.types.ts), so a field added to one side and not the other is caught here", () => {
    expect([...KB_PAGE_COLLECTION_QUERY_FIELDS].sort()).toEqual(
      [...BACKEND_FIXTURE_FIELDS].sort(),
    );
  });

  it("forwards every fixture field to the query params it can build, so the fixture names fields the hook actually sends", () => {
    const probe: Record<string, unknown> = {
      q: "onboarding",
      spaceId: 3,
      projectId: 7,
      owner: "me",
      ownerMembershipId: 11,
      sharedWithMe: "1",
      status: "published",
      verified: true,
      deleted: false,
      sort: "updated_desc",
      cursor: "abc",
      limit: 25,
      facets: true,
    };

    const built = buildKbPageCollectionQueryParams(probe);

    for (const field of KB_PAGE_COLLECTION_QUERY_FIELDS) {
      expect(built).toHaveProperty(field);
    }
  });
});
