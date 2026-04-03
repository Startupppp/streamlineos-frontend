import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Auth mock ────────────────────────────────────────────────────────────────
// Must be declared before any dynamic imports that pull in route handlers,
// because vi.mock() is hoisted to the top of the file by Vitest.

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "CEO", name: "Test User" },
    orgId: "org-1",
    branchId: null,
  }),
}));

// Override the Redis mock from setup.ts with a version that simulates a valid
// active session cache so withAuth() doesn't reject the request.
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue({
      id: "user-1",
      role: "CEO",
      orgId: "org-1",
      branchId: null,
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      image: null,
      firstName: "Test",
      lastName: "User",
      name: "Test User",
    }),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    ping: vi.fn(),
  },
  isRedisEnabled: vi.fn(() => true),
  redisHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
}));

// ── Server query mock ─────────────────────────────────────────────────────────
// Mock the query layer so the route handler never touches the real DB.

vi.mock("@/server/queries/leads", () => ({
  getLeads: vi.fn().mockResolvedValue({
    leads: [],
    totalCount: 0,
    page: 1,
    totalPages: 0,
  }),
}));

// ── Logger mock ───────────────────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Lead trigger mocks ────────────────────────────────────────────────────────
vi.mock("@/server/lib/lead-triggers", () => ({
  evaluateAssignmentRules: vi.fn().mockResolvedValue(undefined),
  recalculateLeadScore: vi.fn().mockResolvedValue(undefined),
  applySlaPolicy: vi.fn().mockResolvedValue(undefined),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with an empty leads list when no leads exist", async () => {
    const { GET } = await import("@/app/api/leads/route");
    const req = new NextRequest("http://localhost/api/leads");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      leads: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });
  });

  it("returns 200 when valid filter query params are passed", async () => {
    const { GET } = await import("@/app/api/leads/route");
    const req = new NextRequest(
      "http://localhost/api/leads?status=NEW&priority=HOT&page=1&limit=20"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it("returns 401 when the session has no user id", async () => {
    const { auth } = await import("@/lib/auth");
    // auth() can return null (no session) — cast to satisfy the overloaded type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { GET } = await import("@/app/api/leads/route");
    const req = new NextRequest("http://localhost/api/leads");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 403 when the cached session shows account deactivated", async () => {
    const { redis } = await import("@/lib/redis");
    vi.mocked(redis!.get).mockResolvedValueOnce({
      id: "user-1",
      role: "CEO",
      orgId: "org-1",
      branchId: null,
      isActive: false,
      hasDashboardAccess: null,
      isPasswordChangeRequired: null,
      image: null,
      firstName: null,
      lastName: null,
      name: null,
    });

    const { GET } = await import("@/app/api/leads/route");
    const req = new NextRequest("http://localhost/api/leads");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Account deactivated");
  });

  it("forwards getLeads results to the response body", async () => {
    const { getLeads } = await import("@/server/queries/leads");
    const mockLeads = [
      {
        id: 1,
        name: "Acme Corp",
        email: "lead@acme.com",
        status: "NEW",
        priority: "HOT",
        orgId: "org-1",
      },
    ];
    vi.mocked(getLeads).mockResolvedValueOnce({
      leads: mockLeads as never,
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    const { GET } = await import("@/app/api/leads/route");
    const req = new NextRequest("http://localhost/api/leads");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].name).toBe("Acme Corp");
  });
});
