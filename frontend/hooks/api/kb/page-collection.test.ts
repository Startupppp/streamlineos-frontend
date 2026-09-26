import {
  KB_PAGE_COLLECTION_QUERY_FIELDS,
  buildKbPageCollectionQueryParams,
} from "./page-collection";

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
