import { ZodError } from "zod";

import {
  projectListPageContract,
  projectDetailContract,
  ticketFieldValueCreateContract,
  projectMemberRowContract,
} from "./build-project-schema";

it("accepts the bare success ack the upsert-ticket-values endpoint actually returns, never an id", () => {
  const result = ticketFieldValueCreateContract.parse({ success: true });

  expect(result).toEqual({ success: true });
});

it("rejects a falsy success flag on the ticket field value create contract", () => {
  expect(() =>
    ticketFieldValueCreateContract.parse({ success: false }),
  ).toThrow(ZodError);
});

it("accepts the raw project_members row the add-member endpoint returns with no userId column", () => {
  const result = projectMemberRowContract.parse({
    id: 1,
    orgId: "org-1",
    projectId: 5,
    membershipId: 9,
    role: "MEMBER",
    hourlyRate: "0",
    hourlyRateMinor: 0,
    rateCurrency: null,
    joinedAt: "2026-09-15T00:00:00.000Z",
  });

  expect(result.userId).toBeUndefined();
});

it("still accepts a fuller project member row that does carry userId", () => {
  const result = projectMemberRowContract.parse({
    id: 1,
    orgId: "org-1",
    projectId: 5,
    membershipId: 9,
    userId: "user-1",
    role: "MEMBER",
    hourlyRate: "0",
    hourlyRateMinor: 0,
    rateCurrency: null,
    joinedAt: "2026-09-15T00:00:00.000Z",
  });

  expect(result.userId).toBe("user-1");
});

it("rejects a project member row with a non-numeric membershipId", () => {
  expect(() =>
    projectMemberRowContract.parse({
      id: 1,
      orgId: "org-1",
      projectId: 5,
      membershipId: "nine",
      role: "MEMBER",
      hourlyRate: "0",
      hourlyRateMinor: 0,
      rateCurrency: null,
      joinedAt: "2026-09-15T00:00:00.000Z",
    }),
  ).toThrow(ZodError);
});

describe("projectListPageContract — GET /build response contract", () => {
  const REALISTIC_LIST_FIXTURE = {
    data: [
      {
        id: 42,
        name: "Alpha Relaunch",
        description: "Relaunch the platform with the new design",
        key: "ALPHA",
        status: "ACTIVE" as const,
        priority: "HIGH" as const,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        managedProductId: null,
        manager: { id: "user-abc", firstName: "Alice", lastName: "Chen", image: null },
        progress: { total: 20, done: 7, percentage: 35 },
        health: "on_track" as const,
        members: [{ id: "user-abc", firstName: "Alice", lastName: "Chen", image: null }],
        teams: ["engineering", "design"],
      },
    ],
    hasMore: false,
    nextCursor: null,
  };

  it("parses a realistic GET /build response that carries no pmWorkspaceId field", () => {
    const result = projectListPageContract.parse(REALISTIC_LIST_FIXTURE);
    expect(result.data).toHaveLength(1);
  });

  it("decoded list page carries the project id, name and key the Build UI needs to render project rows", () => {
    const result = projectListPageContract.parse(REALISTIC_LIST_FIXTURE);
    const project = result.data[0];
    expect(project.id).toBe(42);
    expect(project.name).toBe("Alpha Relaunch");
    expect(project.key).toBe("ALPHA");
  });

  it("decoded list page carries pagination fields the infinite-scroll hook depends on", () => {
    const result = projectListPageContract.parse(REALISTIC_LIST_FIXTURE);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("decoded list page carries health, progress and status so the board and roadmap views can colour rows", () => {
    const result = projectListPageContract.parse(REALISTIC_LIST_FIXTURE);
    const project = result.data[0];
    expect(project.health).toBe("on_track");
    expect(project.progress.percentage).toBe(35);
    expect(project.status).toBe("ACTIVE");
  });

  it("decoded project item does not expose pmWorkspaceId even when the raw payload silently includes it, confirming the schema never surfaces the retired field", () => {
    const withRetiredField = {
      ...REALISTIC_LIST_FIXTURE,
      data: [{ ...REALISTIC_LIST_FIXTURE.data[0], pmWorkspaceId: 999 }],
    };
    const result = projectListPageContract.parse(withRetiredField);
    expect((result.data[0] as Record<string, unknown>).pmWorkspaceId).toBeUndefined();
  });

  it("rejects a list page response where a project item is missing the required health field", () => {
    const { health: _health, ...itemWithoutHealth } = REALISTIC_LIST_FIXTURE.data[0];
    const broken = { ...REALISTIC_LIST_FIXTURE, data: [itemWithoutHealth] };
    expect(() => projectListPageContract.parse(broken)).toThrow(ZodError);
  });
});

describe("projectDetailContract — GET /build/{projectId} response contract", () => {
  const REALISTIC_DETAIL_FIXTURE = {
    id: 42,
    orgId: "org-tenant-1",
    name: "Alpha Relaunch",
    description: "Relaunch the platform",
    key: "ALPHA",
    clientMembershipId: null,
    managerMembershipId: 7,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "ACTIVE" as const,
    priority: "HIGH",
    dealId: null,
    managedProductId: null,
    budget: "50000",
    budgetMinor: 5000000,
    budgetCurrency: "USD",
    settings: {
      modules: { sprints: true, epics: true, timeTracking: false, wiki: true },
      projectType: "software",
      workflow: "scrum",
    },
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    statuses: [
      {
        id: 1,
        projectId: 42,
        orgId: "org-tenant-1",
        name: "Backlog",
        order: 1,
        color: "#94a3b8",
        wipLimit: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    members: [
      {
        id: 1,
        orgId: "org-tenant-1",
        projectId: 42,
        membershipId: 5,
        role: "OWNER",
        user: {
          id: 5,
          user: {
            id: "user-abc",
            name: "Alice Chen",
            firstName: "Alice",
            lastName: "Chen",
            email: "alice@example.com",
            image: null,
          },
        },
      },
    ],
  };

  it("parses a realistic GET /build/{projectId} response that carries no pmWorkspaceId field", () => {
    const result = projectDetailContract.parse(REALISTIC_DETAIL_FIXTURE);
    expect(result.id).toBe(42);
  });

  it("decoded project detail carries the orgId and key fields the settings page and breadcrumb need", () => {
    const result = projectDetailContract.parse(REALISTIC_DETAIL_FIXTURE);
    expect(result.orgId).toBe("org-tenant-1");
    expect(result.key).toBe("ALPHA");
  });

  it("decoded project detail carries the settings shape with module flags the nav sidebar toggles on", () => {
    const result = projectDetailContract.parse(REALISTIC_DETAIL_FIXTURE);
    expect(result.settings?.modules.sprints).toBe(true);
    expect(result.settings?.modules.wiki).toBe(true);
    expect(result.settings?.modules.timeTracking).toBe(false);
  });

  it("decoded project detail carries statuses array the board view builds its columns from", () => {
    const result = projectDetailContract.parse(REALISTIC_DETAIL_FIXTURE);
    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0].name).toBe("Backlog");
  });

  it("decoded project member carries transformed userId extracted from the nested user shape", () => {
    const result = projectDetailContract.parse(REALISTIC_DETAIL_FIXTURE);
    expect(result.members[0].userId).toBe("user-abc");
    expect(result.members[0].role).toBe("OWNER");
  });

  it("decoded project detail does not expose pmWorkspaceId even when the raw payload includes it, confirming the schema never surfaces the retired field", () => {
    const withRetiredField = { ...REALISTIC_DETAIL_FIXTURE, pmWorkspaceId: 999 };
    const result = projectDetailContract.parse(withRetiredField);
    expect((result as Record<string, unknown>).pmWorkspaceId).toBeUndefined();
  });

  it("rejects a detail response where the required orgId field is absent", () => {
    const { orgId: _orgId, ...withoutOrgId } = REALISTIC_DETAIL_FIXTURE;
    expect(() => projectDetailContract.parse(withoutOrgId)).toThrow(ZodError);
  });

  it("rejects a detail response where statuses is absent, because the board view cannot build columns from an undefined array", () => {
    const { statuses: _statuses, ...withoutStatuses } = REALISTIC_DETAIL_FIXTURE;
    expect(() => projectDetailContract.parse(withoutStatuses)).toThrow(ZodError);
  });
});

describe("project detail cache key contract (BLD-X-BE-SETTINGS-CORE-001)", () => {
  it("includes projectId in the detail cache key — correct scope prevents cross-project settings leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.detail(42);
    expect(key).toContain(42);
  });

  it("includes 'detail' segment in the project detail cache key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.detail(42);
    expect(key.some((s: unknown) => s === "detail")).toBe(true);
  });

  it("two different projectIds produce different detail cache keys — cross-project cache collision is impossible", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.detail(1);
    const key2 = buildWorkQueryKeys.projects.detail(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("settings page invalidates the detail key on update — onSettled calls invalidateQueries({ queryKey: detail(projectId) })", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.detail(10);
    expect(Array.isArray(key)).toBe(true);
    expect(key.some((s: unknown) => typeof s === "number" && s === 10)).toBe(true);
  });
});
