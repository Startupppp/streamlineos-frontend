import { viewRowContract, viewPageContract } from "./workspace-schema";

const validViewRow = {
  id: 1,
  projectId: 10,
  orgId: "org-abc",
  createdBy: "user-xyz",
  name: "My Board View",
  filters: {},
  groupBy: null,
  orderBy: null,
  layoutType: "board" as const,
  isPinned: false,
  visibility: "shared" as const,
  displayOptions: null,
  scope: "project" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

describe("viewRowContract (BLD-X-BE-SETTINGS-VIEWS-001)", () => {
  it("accepts a valid view row", () => {
    expect(viewRowContract.safeParse(validViewRow).success).toBe(true);
  });

  it("rejects unknown layoutType — z.string() over a pgEnum would silently accept this", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, layoutType: "timeline" }).success
    ).toBe(false);
  });

  it("accepts every valid layoutType value", () => {
    for (const layoutType of ["board", "list", "table", "calendar", "gantt"] as const) {
      expect(viewRowContract.safeParse({ ...validViewRow, layoutType }).success).toBe(true);
    }
  });

  it("rejects unknown visibility value — enum guard is in force", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, visibility: "public" }).success
    ).toBe(false);
  });

  it("accepts both valid visibility values", () => {
    expect(viewRowContract.safeParse({ ...validViewRow, visibility: "private" }).success).toBe(true);
    expect(viewRowContract.safeParse({ ...validViewRow, visibility: "shared" }).success).toBe(true);
  });

  it("rejects unknown scope value", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, scope: "org" }).success
    ).toBe(false);
  });

  it("accepts both valid scope values", () => {
    expect(viewRowContract.safeParse({ ...validViewRow, scope: "project" }).success).toBe(true);
    expect(viewRowContract.safeParse({ ...validViewRow, scope: "workspace" }).success).toBe(true);
  });

  it("accepts null displayOptions", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, displayOptions: null }).success
    ).toBe(true);
  });

  it("accepts an object for displayOptions", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, displayOptions: { compact: true } }).success
    ).toBe(true);
  });

  it("accepts null projectId", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, projectId: null }).success
    ).toBe(true);
  });

  it("rejects isPinned as a string — boolean field must not accept a stringly-typed value", () => {
    expect(
      viewRowContract.safeParse({ ...validViewRow, isPinned: "true" }).success
    ).toBe(false);
  });

  it("accepts isPinned as a boolean", () => {
    expect(viewRowContract.safeParse({ ...validViewRow, isPinned: true }).success).toBe(true);
    expect(viewRowContract.safeParse({ ...validViewRow, isPinned: false }).success).toBe(true);
  });

  it("rejects a row missing required name", () => {
    const { name: _name, ...withoutName } = validViewRow;
    expect(viewRowContract.safeParse(withoutName).success).toBe(false);
  });

  it("rejects a row missing updatedAt", () => {
    const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validViewRow;
    expect(viewRowContract.safeParse(withoutUpdatedAt).success).toBe(false);
  });
});

describe("viewPageContract (BLD-X-BE-SETTINGS-VIEWS-002)", () => {
  const validPage = {
    data: [validViewRow],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };

  it("accepts a valid cursor page", () => {
    expect(viewPageContract.safeParse(validPage).success).toBe(true);
  });

  it("accepts an empty data array", () => {
    expect(viewPageContract.safeParse({ ...validPage, data: [] }).success).toBe(true);
  });

  it("rejects a bare array — must be a cursor page envelope", () => {
    expect(viewPageContract.safeParse([validViewRow]).success).toBe(false);
  });

  it("rejects a page with unknown layoutType inside data", () => {
    expect(
      viewPageContract.safeParse({ ...validPage, data: [{ ...validViewRow, layoutType: "KANBAN" }] }).success
    ).toBe(false);
  });

  it("rejects a page missing the pagination envelope", () => {
    expect(viewPageContract.safeParse({ data: [validViewRow] }).success).toBe(false);
  });
});

describe("views cache key contract (BLD-X-BE-SETTINGS-VIEWS-003)", () => {
  it("includes projectId in the key for project-scoped views", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.views(42);
    expect(key).toContain(42);
  });

  it("includes the 'views' segment in the key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.views(42);
    expect(Array.isArray(key)).toBe(true);
    expect(key.some((segment: unknown) => segment === "views")).toBe(true);
  });

  it("two different projectIds produce different keys — cross-project cache collision is impossible", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.views(1);
    const key2 = buildWorkQueryKeys.projects.views(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });
});
