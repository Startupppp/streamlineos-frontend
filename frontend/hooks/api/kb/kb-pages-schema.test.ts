import {
  kbPageBacklinkContract,
  kbPageBacklinksPageContract,
  kbPageWithAncestorsContract,
  kbPageListItemContract,
  kbPageListContract,
  kbFavoritePageListContract,
  kbPageContract,
} from "./kb-pages-schema";
import { kbPageCommentListContract } from "./kb-comments-schema";

const WIRE_FIXTURE = {
  id: 1,
  orgId: "org-1",
  spaceId: null,
  parentPageId: null,
  sortOrder: null,
  projectId: 7,
  title: "Architecture Decision Record",
  icon: null,
  coverImage: null,
  status: "published",
  contentType: "rich-text",
  kind: "document",
  trustState: "verified",
  visibility: "org",
  publicToken: null,
  publicSlug: null,
  content: null,
  contentText: null,
  isLocked: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  deletedAt: null,
  createdByMembershipId: 1,
  lastEditedByMembershipId: 1,
  deletedByMembershipId: null,
  ownerMembershipId: 1,
  verifiedByMembershipId: 1,
  createdById: "user-1",
  lastEditedById: "user-1",
  deletedById: null,
  ownerUserId: "user-1",
  verifiedById: "user-1",
  verifiedUntil: null,
  nextReviewAt: null,
  aclRevision: 3,
  contentRevision: 7,
  legalHold: false,
  legalHoldReason: null,
  ancestors: [{ id: 9, title: "Handbook" }],
  isFavorite: false,
  canEdit: true,
  can: { view: true, comment: true, edit: true, manage: false, restore: false },
  access: { via: "organization", grantExpiresAt: null },
};

describe("kbPageWithAncestorsContract — server/client schema parity for wiki page detail (FE-28)", () => {
  it("parses a wire payload including all backend-projected fields without error so a field present in the backend but absent from the FE contract fails here", () => {
    expect(kbPageWithAncestorsContract.safeParse(WIRE_FIXTURE).success).toBe(true);
  });

  it("parses ancestors including id and title so the breadcrumb can render without undefined access", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.ancestors).toHaveLength(1);
    expect(parsed.ancestors[0]).toEqual({ id: 9, title: "Handbook" });
  });

  it("parses projectId so the wiki page detail knows its build scope and the back-to-wiki link is correct", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.projectId).toBe(7);
  });

  it("parses contentRevision so the optimistic update can send the correct expectedContentRevision and detect staleness on concurrent edits", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.contentRevision).toBe(7);
  });

  it("preserves isFavorite and canEdit so the toolbar shows the correct actions without a second request", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.isFavorite).toBe(false);
    expect(parsed.canEdit).toBe(true);
  });

  it("parses ownerUserId so the right panel can display the page owner without a separate membership lookup", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.ownerUserId).toBe("user-1");
  });

  it("accepts an empty ancestors array for a root-level page so the breadcrumb renders gracefully", () => {
    const rootPage = { ...WIRE_FIXTURE, ancestors: [] };
    const parsed = kbPageWithAncestorsContract.safeParse(rootPage);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.ancestors).toHaveLength(0);
  });

  it("accepts canEdit absent from the payload because the field is optional — older API versions may omit it", () => {
    const { canEdit: _canEdit, ...withoutCanEdit } = WIRE_FIXTURE;
    const parsed = kbPageWithAncestorsContract.safeParse(withoutCanEdit);
    expect(parsed.success).toBe(true);
  });

  it("parses the can capabilities object so the toolbar can show the correct action set without a second request", () => {
    const parsed = kbPageWithAncestorsContract.parse(WIRE_FIXTURE);
    expect(parsed.can).toEqual({ view: true, comment: true, edit: true, manage: false, restore: false });
  });

  it("rejects a payload missing can so a backend regression that omits the capabilities block is caught at the contract boundary", () => {
    const { can: _can, ...withoutCan } = WIRE_FIXTURE;
    expect(kbPageWithAncestorsContract.safeParse(withoutCan).success).toBe(false);
  });

  it("accepts array-shaped content from a template-created page so pages created from block-array templates render without a contract error", () => {
    const arrayContent = [{ type: "paragraph", content: [] }, { type: "heading", attrs: { level: 1 }, content: [] }];
    const parsed = kbPageWithAncestorsContract.safeParse({ ...WIRE_FIXTURE, content: arrayContent });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Array.isArray(parsed.data.content)).toBe(true);
  });
});

describe("kbPageWithAncestorsContract — every access route the backend emits parses, so a page opened through a team folder loads", () => {
  it.each(["team_folder", "team_folder_admin", "inherited_grant"] as const)("accepts access.via = %s", (via) => {
    expect(kbPageWithAncestorsContract.safeParse({ ...WIRE_FIXTURE, access: { via, grantExpiresAt: null } }).success).toBe(true);
  });

  it("CONTROL: still rejects an access route the backend never emits", () => {
    expect(kbPageWithAncestorsContract.safeParse({ ...WIRE_FIXTURE, access: { via: "anyone", grantExpiresAt: null } }).success).toBe(false);
  });
});

describe("kbPageBacklinksPageContract — server/client schema parity", () => {
  it("parses the cursor page returned by the backlinks endpoint", () => {
    const result = kbPageBacklinksPageContract.safeParse({
      data: [{ id: 4, title: "Linked page", icon: null }],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a bare array so a backend contract regression is caught", () => {
    expect(kbPageBacklinksPageContract.safeParse([]).success).toBe(false);
    expect(kbPageBacklinkContract.parse({ id: 4, title: "Linked page", icon: null })).toEqual({
      id: 4,
      title: "Linked page",
      icon: null,
    });
  });
});

describe("kbPageCommentListContract — server/client schema parity", () => {
  it("parses the cursor page returned by the comments endpoint", () => {
    const result = kbPageCommentListContract.safeParse({
      data: [],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a bare array so a comments contract regression is caught", () => {
    expect(kbPageCommentListContract.safeParse([]).success).toBe(false);
  });
});

const KB_PAGE_LIST_ITEM_FIXTURE = {
  id: 42,
  orgId: "org-abc",
  spaceId: null,
  parentPageId: null,
  sortOrder: 100,
  projectId: null,
  title: "New Page",
  icon: null,
  coverImage: null,
  status: "draft",
  contentType: "note",
  kind: "document",
  trustState: "unverified",
  visibility: "org",
  publicToken: null,
  publicSlug: null,
  isLocked: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  deletedAt: null,
  createdByMembershipId: 5,
  lastEditedByMembershipId: 5,
  deletedByMembershipId: null,
  ownerMembershipId: null,
  verifiedByMembershipId: null,
  createdById: "user-xyz",
  lastEditedById: "user-xyz",
  deletedById: null,
  ownerUserId: null,
  verifiedById: null,
  verifiedUntil: null,
  nextReviewAt: null,
  aclRevision: 1,
  contentRevision: 1,
  legalHold: false,
  legalHoldReason: null,
  aclRevisionChangedAt: null,
  publicTokenHash: null,
  publicTokenRevision: 1,
  externalId: null,
  externalSource: null,
  slug: null,
  excerpt: null,
  categoryId: null,
  views: 0,
  helpfulCount: 0,
  notHelpfulCount: 0,
  seoTitle: null,
  seoDescription: null,
  reviewIntervalDays: null,
  publishedAt: null,
  archivedAt: null,
  verifiedAt: null,
};

describe("kbPageListItemContract — backend-required fields must be required in the frontend contract so cache defaults do not mask backend regressions (FE-28)", () => {
  it("rejects a payload missing legalHold so a backend regression that drops the NOT NULL column is caught at the contract boundary rather than silently defaulting on every cache entry", () => {
    const { legalHold: _lh, ...withoutLegalHold } = KB_PAGE_LIST_ITEM_FIXTURE;
    expect(kbPageListItemContract.safeParse(withoutLegalHold).success).toBe(false);
  });

  it("rejects a payload missing legalHoldReason so an omitted nullable DB column is surfaced as a contract violation rather than silently replaced with null", () => {
    const { legalHoldReason: _lhr, ...withoutLegalHoldReason } = KB_PAGE_LIST_ITEM_FIXTURE;
    expect(kbPageListItemContract.safeParse(withoutLegalHoldReason).success).toBe(false);
  });
});

describe("kbPageListItemContract — server/client schema parity for the recent and favorites list endpoints (FE-28)", () => {
  it("parses a favorites cursor page and preserves continuation metadata", () => {
    const response = {
      data: [KB_PAGE_LIST_ITEM_FIXTURE],
      pagination: { limit: 50, hasMore: true, nextCursor: "next" },
    };
    const parsed = kbFavoritePageListContract.parse(response);
    expect(parsed.data[0]?.id).toBe(KB_PAGE_LIST_ITEM_FIXTURE.id);
    expect(parsed.pagination).toEqual(response.pagination);
  });

  it("parses a complete KB_PAGE_LIST_COLUMNS wire fixture for a newly created page without error so a freshly inserted row does not break the recent pages strip", () => {
    expect(kbPageListItemContract.safeParse(KB_PAGE_LIST_ITEM_FIXTURE).success).toBe(true);
  });

  it("parses a list containing both a pre-existing published page and a newly created draft page without error so the wiki does not become unloadable after the first create", () => {
    const existing = {
      ...KB_PAGE_LIST_ITEM_FIXTURE,
      id: 1,
      status: "published",
      trustState: "verified",
      ownerMembershipId: 1,
      ownerUserId: "user-existing",
    };
    const newPage = { ...KB_PAGE_LIST_ITEM_FIXTURE, id: 42 };
    expect(kbPageListContract.safeParse([existing, newPage]).success).toBe(true);
  });
});

const KB_PAGE_CREATE_FIXTURE = {
  ...KB_PAGE_LIST_ITEM_FIXTURE,
  content: null,
  contentText: "",
};

describe("kbPageContract — backend-required fields must be required so the create response is fully validated (FE-28)", () => {
  it("rejects a create-response payload missing legalHold so a backend that omits the field is caught before onSuccess caches a KbPage with a silently defaulted value", () => {
    const { legalHold: _lh, ...withoutLegalHold } = KB_PAGE_CREATE_FIXTURE;
    expect(kbPageContract.safeParse(withoutLegalHold).success).toBe(false);
  });
});

describe("kbPageContract — server/client schema parity for the create and update response (FE-28)", () => {
  it("parses a complete KB_PAGE_COLUMNS wire fixture for a newly created page without error so the create mutation resolves rather than falling to onError", () => {
    expect(kbPageContract.safeParse(KB_PAGE_CREATE_FIXTURE).success).toBe(true);
  });

  it("parses the create response when content is a rich-text document object so a page created from a template does not break the mutation", () => {
    const templatePage = {
      ...KB_PAGE_CREATE_FIXTURE,
      content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
      contentText: "Template paragraph",
    };
    expect(kbPageContract.safeParse(templatePage).success).toBe(true);
  });
});

describe("kbPageWithAncestorsContract — kind during a frontend-first rollout", () => {
  it("reads a page from a backend that predates kind as a document, so Docs keeps loading", () => {
    const { kind: _omitted, ...withoutKind } = WIRE_FIXTURE;
    expect(kbPageWithAncestorsContract.parse(withoutKind).kind).toBe("document");
  });

  it("keeps a spreadsheet kind the backend sends and rejects an unknown kind", () => {
    expect(kbPageWithAncestorsContract.parse({ ...WIRE_FIXTURE, kind: "spreadsheet" }).kind).toBe("spreadsheet");
    expect(kbPageWithAncestorsContract.safeParse({ ...WIRE_FIXTURE, kind: "slides" }).success).toBe(false);
  });
});
