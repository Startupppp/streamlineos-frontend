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

vi.mock("@/server/actions/create-notification", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/deals/approvals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with an array of approvals", async () => {
    const { GET } = await import("@/app/api/deals/approvals/route");
    const req = new NextRequest("http://localhost/api/deals/approvals");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("supports status filter via query param", async () => {
    const { GET } = await import("@/app/api/deals/approvals/route");
    const req = new NextRequest("http://localhost/api/deals/approvals?status=pending");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("validates stage enum in approval requests", async () => {
    const { POST } = await import("@/app/api/deals/approvals/route");
    const req = new NextRequest("http://localhost/api/deals/approvals", {
      method: "POST",
      body: JSON.stringify({ dealId: 1, requestedStage: "INVALID_STAGE" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { GET } = await import("@/app/api/deals/approvals/route");
    const req = new NextRequest("http://localhost/api/deals/approvals");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("non-admin cannot resolve approvals", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-2", role: "SALES", name: "Sales Rep" },
      orgId: "org-1",
      branchId: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { redis } = await import("@/lib/redis");
    vi.mocked(redis!.get).mockResolvedValueOnce({
      isActive: true,
      role: "SALES",
      orgId: "org-1",
      branchId: null,
      name: "Sales Rep",
      image: null,
      firstName: null,
      lastName: null,
      hasDashboardAccess: null,
      isPasswordChangeRequired: false,
    });

    const { POST } = await import("@/app/api/deals/approvals/route");
    const req = new NextRequest("http://localhost/api/deals/approvals", {
      method: "POST",
      body: JSON.stringify({ approvalId: 1, action: "approve" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
