import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "CEO", name: "Test User" },
    orgId: "org-1",
    branchId: null,
  }),
}));

vi.mock("@/lib/db", () => {
  const chain = (): unknown => new Proxy(() => Promise.resolve([]), {
    get: (_t, p) => p === "then" ? Promise.resolve([]).then.bind(Promise.resolve([])) : vi.fn(chain),
    apply: () => chain(),
  });
  return {
    db: {
      query: new Proxy({}, { get: () => new Proxy({}, { get: () => ({ findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) }) }) }),
      select: vi.fn(chain),
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })) })) })),
      delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })),
    },
    client: {},
  };
});

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockImplementation((key: string) => {
      if (key.startsWith("user:session:")) {
        return Promise.resolve({
          isActive: true,
          role: "CEO",
          orgId: "org-1",
          branchId: null,
          name: "Test User",
          image: null,
          firstName: null,
          lastName: null,
          hasDashboardAccess: true,
          isPasswordChangeRequired: false,
        });
      }
      return Promise.resolve(null);
    }),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
  isRedisEnabled: vi.fn(() => true),
}));

describe("GET /api/clients/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with items and summary", async () => {
    const { GET } = await import("@/app/api/clients/health/route");
    const req = new NextRequest("http://localhost/api/clients/health");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("summary");
    expect(body.summary).toHaveProperty("healthy");
    expect(body.summary).toHaveProperty("at_risk");
    expect(body.summary).toHaveProperty("critical");
  });

  it("supports health status filter", async () => {
    const { GET } = await import("@/app/api/clients/health/route");
    const req = new NextRequest("http://localhost/api/clients/health?status=at_risk");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { GET } = await import("@/app/api/clients/health/route");
    const req = new NextRequest("http://localhost/api/clients/health");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/clients/churn-alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with alerts and summary", async () => {
    const { GET } = await import("@/app/api/clients/churn-alerts/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("alerts");
    expect(body).toHaveProperty("summary");
    expect(body.summary).toHaveProperty("critical");
    expect(body.summary).toHaveProperty("atRisk");
    expect(body.summary).toHaveProperty("total");
  });
});
