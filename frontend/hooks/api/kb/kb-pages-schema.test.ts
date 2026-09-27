import { kbPageWithAncestorsContract } from "./kb-pages-schema";

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
});
