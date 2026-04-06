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

describe("GET /api/deals/forecast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with forecast summary containing byMonth and byStage", async () => {
    const { GET } = await import("@/app/api/deals/forecast/route");
    const req = new NextRequest("http://localhost/api/deals/forecast");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalWeighted");
    expect(body).toHaveProperty("totalBestCase");
    expect(body).toHaveProperty("totalDeals");
    expect(body).toHaveProperty("byMonth");
    expect(body).toHaveProperty("byStage");
    expect(Array.isArray(body.byMonth)).toBe(true);
    expect(Array.isArray(body.byStage)).toBe(true);
  });

  it("handles empty deals gracefully", async () => {
    const { GET } = await import("@/app/api/deals/forecast/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDeals).toBe(0);
    expect(body.totalWeighted).toBe(0);
    expect(body.totalBestCase).toBe(0);
  });

  it("is scoped to the user org", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { GET } = await import("@/app/api/deals/forecast/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
