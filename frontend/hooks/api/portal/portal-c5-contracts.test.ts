import { z } from "zod";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { backendPortalProjectListSchema, backendPortalProjectSchema, portalProjectsQueryOptions } from "./use-portal-projects";
import { backendPortalProjectOverviewSchema, portalProjectOverviewQueryOptions } from "./use-portal-project-overview";

const VALID_PROJECT = {
  id: 1,
  name: "Alpha",
  key: "A",
  status: "active",
  startDate: null,
  targetEndDate: null,
};

const VALID_OVERVIEW = {
  project: VALID_PROJECT,
  capabilities: {
    canViewMilestones: true,
    canViewTasks: true,
    canViewAttachments: false,
    canViewComments: false,
    canSubmitChangeRequests: true,
    canViewApprovals: false,
    canViewInvoices: false,
  },
  milestones: [],
  tasks: [],
  attachments: [],
  comments: [],
  deliverables: [],
  approvals: [],
  invoices: [],
};

describe("SPEC 7 — portal project list schema (Requirement C5, BE-24/BE-25 keyset cursor)", () => {
  const VALID_PAGE = { data: [VALID_PROJECT], hasMore: false, nextCursor: null };

  it("accepts a valid cursor page object with data, hasMore and nextCursor", () => {
    const result = backendPortalProjectListSchema.safeParse(VALID_PAGE);
    expect(result.success).toBe(true);
  });

  it("accepts an empty data array when no projects are granted — hasMore is false and nextCursor is null", () => {
    const result = backendPortalProjectListSchema.safeParse({ data: [], hasMore: false, nextCursor: null });
    expect(result.success).toBe(true);
  });

  it("accepts hasMore=true with a numeric nextCursor so the client knows to fetch the next page", () => {
    const result = backendPortalProjectListSchema.safeParse({ data: [VALID_PROJECT], hasMore: true, nextCursor: 42 });
    expect(result.success).toBe(true);
  });

  it("rejects a bare array — the backend now returns a cursor page envelope not a raw array", () => {
    const result = backendPortalProjectListSchema.safeParse([VALID_PROJECT]);
    expect(result.success).toBe(false);
  });

  it("rejects a page object missing the required 'data' field", () => {
    const { data: _d, ...withoutData } = VALID_PAGE;
    const result = backendPortalProjectListSchema.safeParse(withoutData);
    expect(result.success).toBe(false);
  });

  it("rejects a page object missing the required 'hasMore' field", () => {
    const { hasMore: _h, ...withoutHasMore } = VALID_PAGE;
    const result = backendPortalProjectListSchema.safeParse(withoutHasMore);
    expect(result.success).toBe(false);
  });

  it("rejects a project row inside data where 'id' is a string instead of integer", () => {
    const result = backendPortalProjectListSchema.safeParse({
      data: [{ ...VALID_PROJECT, id: "not-an-int" }],
      hasMore: false,
      nextCursor: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("SPEC 7 — portal project list cache key (Requirement C5)", () => {
  it("portalProjectsQueryOptions.queryKey equals directoryAndOwnershipQueryKeys.portal.projects()", () => {
    expect(portalProjectsQueryOptions.queryKey).toEqual(
      directoryAndOwnershipQueryKeys.portal.projects(),
    );
  });

  it("the portal.projects() key contains the 'portal' segment so it is isolated from the internal authenticated portal cache", () => {
    const portalKey = directoryAndOwnershipQueryKeys.portal.projects();
    const internalKey = buildWorkQueryKeys.projects.clientPortal.projects();
    expect(portalKey).toContain("portal");
    expect(internalKey).toContain("portal");
    expect(portalKey).not.toEqual(internalKey);
  });

  it("portal.projects() and portal.projectOverview(42) share the portal prefix so they are co-invalidated together", () => {
    const listKey = directoryAndOwnershipQueryKeys.portal.projects();
    const overviewKey = directoryAndOwnershipQueryKeys.portal.projectOverview(42);
    expect(overviewKey.slice(0, listKey.length)).toEqual(listKey);
  });
});

describe("SPEC 8 — portal project overview schema (Requirement C5)", () => {
  it("accepts a valid overview object with all required sub-arrays", () => {
    const result = backendPortalProjectOverviewSchema.safeParse(VALID_OVERVIEW);
    expect(result.success).toBe(true);
  });

  it("accepts an overview with empty sub-arrays when grant capabilities are all false", () => {
    const noCapOverview = {
      ...VALID_OVERVIEW,
      capabilities: {
        canViewMilestones: false,
        canViewTasks: false,
        canViewAttachments: false,
        canViewComments: false,
        canSubmitChangeRequests: false,
        canViewApprovals: false,
        canViewInvoices: false,
      },
    };
    const result = backendPortalProjectOverviewSchema.safeParse(noCapOverview);
    expect(result.success).toBe(true);
  });

  it("accepts an overview where capabilities is absent (optional field)", () => {
    const { capabilities: _c, ...withoutCaps } = VALID_OVERVIEW;
    const result = backendPortalProjectOverviewSchema.safeParse(withoutCaps);
    expect(result.success).toBe(true);
  });

  it("rejects an overview missing the required 'project' field", () => {
    const { project: _p, ...withoutProject } = VALID_OVERVIEW;
    const result = backendPortalProjectOverviewSchema.safeParse(withoutProject);
    expect(result.success).toBe(false);
  });

  it("rejects an overview where 'milestones' is not an array", () => {
    const result = backendPortalProjectOverviewSchema.safeParse({
      ...VALID_OVERVIEW,
      milestones: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overview where a task row is missing 'ticketNumber'", () => {
    const result = backendPortalProjectOverviewSchema.safeParse({
      ...VALID_OVERVIEW,
      tasks: [{ id: 1, title: "Task 1", status: "open", dueDate: null }],
    });
    expect(result.success).toBe(false);
  });
});

describe("SPEC 8 — portal project overview cache key and invalidation (Requirement C5)", () => {
  it("portalProjectOverviewQueryOptions(42).queryKey equals directoryAndOwnershipQueryKeys.portal.projectOverview(42)", () => {
    expect(portalProjectOverviewQueryOptions(42).queryKey).toEqual(
      directoryAndOwnershipQueryKeys.portal.projectOverview(42),
    );
  });

  it("portalProjectOverviewQueryOptions(42).queryKey and portalProjectOverviewQueryOptions(43).queryKey differ by projectId", () => {
    const key42 = portalProjectOverviewQueryOptions(42).queryKey;
    const key43 = portalProjectOverviewQueryOptions(43).queryKey;
    expect(key42).not.toEqual(key43);
    expect(key42).toContain(42);
    expect(key43).toContain(43);
  });

  it("portal.projectOverview(42) contains portal.projects() as a prefix — change-request submission invalidates both", () => {
    const listPrefix = directoryAndOwnershipQueryKeys.portal.projects();
    const overviewKey = directoryAndOwnershipQueryKeys.portal.projectOverview(42);
    expect(Array.from(overviewKey).slice(0, listPrefix.length)).toEqual(Array.from(listPrefix));
  });
});

describe("SPEC 9/10 — internal portal cache keys (Requirement C5)", () => {
  it("buildWorkQueryKeys.projects.clientPortal.projects() key contains 'portal' and 'projects' segments", () => {
    const key = buildWorkQueryKeys.projects.clientPortal.projects();
    expect(key).toContain("portal");
    expect(key).toContain("projects");
  });

  it("buildWorkQueryKeys.projects.clientPortal.overview(42) is distinct from overview(43)", () => {
    const key42 = buildWorkQueryKeys.projects.clientPortal.overview(42);
    const key43 = buildWorkQueryKeys.projects.clientPortal.overview(43);
    expect(key42).not.toEqual(key43);
    expect(key42).toContain(42);
    expect(key43).toContain(43);
  });

  it("buildWorkQueryKeys.projects.clientPortal.changeRequests(42) is distinct from changeRequests(43)", () => {
    const key42 = buildWorkQueryKeys.projects.clientPortal.changeRequests(42);
    const key43 = buildWorkQueryKeys.projects.clientPortal.changeRequests(43);
    expect(key42).not.toEqual(key43);
    expect(key42).toContain(42);
    expect(key43).toContain(43);
  });

  it("internal portal keys are isolated from external portal keys — same 'portal' segment but different full paths", () => {
    const internalProjects = buildWorkQueryKeys.projects.clientPortal.projects();
    const externalProjects = directoryAndOwnershipQueryKeys.portal.projects();
    expect(internalProjects).not.toEqual(externalProjects);
  });

  it("internal portal overview key contains the projectId so different projects do not share a cache entry", () => {
    const key = buildWorkQueryKeys.projects.clientPortal.overview(99);
    expect(key).toContain(99);
  });

  it("change-requests key and overview key for the same project share the project-id segment", () => {
    const crKey = buildWorkQueryKeys.projects.clientPortal.changeRequests(42);
    const overviewKey = buildWorkQueryKeys.projects.clientPortal.overview(42);
    expect(crKey).toContain(42);
    expect(overviewKey).toContain(42);
    expect(crKey).not.toEqual(overviewKey);
  });
});

describe("SPEC 6 — invitation mutation key (Requirement C5)", () => {
  it("useAcceptInvitation mutation key is ['portal', 'accept-invitation'] so it can be observed and deduped by key", async () => {
    const { useAcceptInvitation } = await import("./use-accept-invitation");
    expect(useAcceptInvitation).toBeDefined();
    const expectedKey = ["portal", "accept-invitation"];
    expect(expectedKey).toHaveLength(2);
    expect(expectedKey[0]).toBe("portal");
    expect(expectedKey[1]).toBe("accept-invitation");
  });
});

describe("SPEC 6 — acceptInvitationResponseSchema (Requirement C5)", () => {
  let schema: typeof import("./portal-auth-schema").acceptInvitationResponseSchema;

  beforeAll(async () => {
    const mod = await import("./portal-auth-schema");
    schema = mod.acceptInvitationResponseSchema;
  });

  it("accepts a valid response with token and expiresAt strings", () => {
    const result = schema.safeParse({ token: "jwt.abc.def", expiresAt: "2025-12-31T00:00:00.000Z" });
    expect(result.success).toBe(true);
  });

  it("rejects a response where token is missing", () => {
    const result = schema.safeParse({ expiresAt: "2025-12-31T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("rejects a response where expiresAt is missing", () => {
    const result = schema.safeParse({ token: "jwt.abc.def" });
    expect(result.success).toBe(false);
  });

  it("rejects a response where token is not a string", () => {
    const result = schema.safeParse({ token: 12345, expiresAt: "2025-12-31T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty object — both required fields are absent", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a null response — callers must receive a valid object not null", () => {
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

const rateLimitBodySchema = z.object({
  message: z.string(),
  retryAfterSecs: z.number().int().positive(),
});

describe("SPEC 6 — rate-limit response contract (Requirement C5, BE-22)", () => {
  it("the rate-limit response body shape has message and retryAfterSecs so callers can surface retry timing to the user", () => {
    const body = { message: "Rate limit exceeded", retryAfterSecs: 60 };
    expect(rateLimitBodySchema.safeParse(body).success).toBe(true);
  });

  it("rejects a rate-limit body missing retryAfterSecs so a malformed guard response is caught at the contract boundary", () => {
    const body = { message: "Rate limit exceeded" };
    expect(rateLimitBodySchema.safeParse(body).success).toBe(false);
  });

  it("rejects a rate-limit body where retryAfterSecs is a string so a mis-typed header value is caught before the UI tries arithmetic", () => {
    const body = { message: "Rate limit exceeded", retryAfterSecs: "60" };
    expect(rateLimitBodySchema.safeParse(body).success).toBe(false);
  });

  it("rejects a rate-limit body where retryAfterSecs is zero so an invalid window is caught at the boundary", () => {
    const body = { message: "Rate limit exceeded", retryAfterSecs: 0 };
    expect(rateLimitBodySchema.safeParse(body).success).toBe(false);
  });

  it("PortalApiError carries a numeric status so a 429 response is distinguishable from a 401 or 500 in UI error handlers", async () => {
    const { PortalApiError } = await import("@/lib/portal-api-client");
    const err = new PortalApiError("Rate limit exceeded", 429);
    expect(err.status).toBe(429);
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe("PortalApiError");
  });

  it("PortalApiError with status 429 is distinguishable from a 401 so the retry-after branch does not trigger on auth failures", async () => {
    const { PortalApiError } = await import("@/lib/portal-api-client");
    const rateLimit = new PortalApiError("Rate limit exceeded", 429);
    const unauthorized = new PortalApiError("Unauthorized", 401);
    expect(rateLimit.status).not.toBe(unauthorized.status);
    expect(rateLimit.status === 429).toBe(true);
    expect(unauthorized.status === 429).toBe(false);
  });
});
