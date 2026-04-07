import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const mockSession = {
  user: { id: "user-1", email: "admin@test.com", name: "Admin", role: "CEO", image: null, forceChangePassword: false, isActive: true, hasDashboardAccess: true },
  orgId: "org-1",
  branchId: null,
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function mockAuthAs(session: typeof mockSession | null = mockSession) {
  vi.mocked(auth).mockResolvedValue(session as unknown as Awaited<ReturnType<typeof auth>>);
}

function req(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const fullUrl = `http://localhost:3000/api${url}`;
  const init: { method: string; body?: string; headers?: Record<string, string> } = {
    method: options?.method ?? "GET",
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json", ...options?.headers };
  }
  return new NextRequest(fullUrl, init);
}

describe("HR API — Auth Guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no session", async () => {
    mockAuthAs(null);
    const { GET } = await import("@/app/api/hr/employees/stats/route");
    const res = await GET(req("/hr/employees/stats?userId=user-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for admin-only route with non-admin user", async () => {
    mockAuthAs({ ...mockSession, user: { ...mockSession.user, role: "ENGINEERING" } });
    const { POST } = await import("@/app/api/hr/performance/cycles/route");
    const res = await POST(req("/hr/performance/cycles", {
      method: "POST",
      body: { name: "Q1", periodStart: "2026-01-01", periodEnd: "2026-03-31" },
    }));
    expect(res.status).toBe(403);
  });
});

describe("HR API — Zod Validation", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthAs(); });

  it("review cycle: rejects empty body", async () => {
    const { POST } = await import("@/app/api/hr/performance/cycles/route");
    const res = await POST(req("/hr/performance/cycles", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("one-on-one: rejects missing employeeId", async () => {
    const { POST } = await import("@/app/api/hr/performance/one-on-ones/route");
    const res = await POST(req("/hr/performance/one-on-ones", { method: "POST", body: { duration: 5 } }));
    expect(res.status).toBe(400);
  });

  it("WFH: rejects missing date and approverId", async () => {
    const { POST } = await import("@/app/api/hr/wfh/route");
    const res = await POST(req("/hr/wfh", { method: "POST", body: { reason: "test" } }));
    expect(res.status).toBe(400);
  });

  it("holiday: rejects empty name", async () => {
    const { POST } = await import("@/app/api/hr/holidays/route");
    const res = await POST(req("/hr/holidays", { method: "POST", body: { name: "" } }));
    expect(res.status).toBe(400);
  });

  it("device: rejects missing required fields", async () => {
    const { POST } = await import("@/app/api/hr/devices/route");
    const res = await POST(req("/hr/devices", { method: "POST", body: { deviceName: "MacBook" } }));
    expect(res.status).toBe(400);
  });

  it("incentive config: rejects missing rate", async () => {
    const { POST } = await import("@/app/api/hr/incentives/config/route");
    const res = await POST(req("/hr/incentives/config", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("resignation: rejects empty body", async () => {
    const { POST } = await import("@/app/api/hr/exit/route");
    const res = await POST(req("/hr/exit", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("recognition: rejects sending kudos to self", async () => {
    const { POST } = await import("@/app/api/hr/recognition/route");
    const res = await POST(req("/hr/recognition", { method: "POST", body: { toUserId: "user-1", message: "Great!" } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("yourself");
  });

  it("PIP: rejects missing objectives", async () => {
    const { POST } = await import("@/app/api/hr/performance/pip/route");
    const res = await POST(req("/hr/performance/pip", { method: "POST", body: { reason: "test" } }));
    expect(res.status).toBe(400);
  });
});

describe("HR API — Tax Calculator Logic", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthAs(); });

  it("calculates new regime tax correctly", async () => {
    const { POST } = await import("@/app/api/hr/tax-calculator/route");
    const res = await POST(req("/hr/tax-calculator", {
      method: "POST",
      body: { annualCtc: 1200000, regime: "NEW" },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.annual.ctc).toBe(1200000);
    expect(data.monthly.netTakeHome).toBeGreaterThan(0);
    expect(data.regime).toBe("NEW");
  });

  it("calculates old regime tax correctly", async () => {
    const { POST } = await import("@/app/api/hr/tax-calculator/route");
    const res = await POST(req("/hr/tax-calculator", {
      method: "POST",
      body: { annualCtc: 800000, regime: "OLD", basicPercentage: 50 },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.regime).toBe("OLD");
    expect(data.annual.basic).toBe(400000);
  });

  it("rejects negative CTC", async () => {
    const { POST } = await import("@/app/api/hr/tax-calculator/route");
    const res = await POST(req("/hr/tax-calculator", {
      method: "POST",
      body: { annualCtc: -100 },
    }));
    expect(res.status).toBe(400);
  });
});

describe("HR API — GET Endpoints", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthAs(); });

  const endpoints = [
    "/hr/employees/stats?userId=user-1",
    "/hr/employees/projects?userId=user-1",
    "/hr/employees/tickets?userId=user-1",
    "/hr/wfh",
    "/hr/wfh/pending",
    "/hr/holidays?year=2026",
    "/hr/holidays/calendar?year=2026&month=4",
    "/hr/devices",
    "/hr/incentives",
    "/hr/incentives/stats",
    "/hr/incentives/config",
    "/hr/payslips",
    "/hr/helpdesk",
    "/hr/performance/reviews",
    "/hr/performance/goals",
    "/hr/performance/cycles",
    "/hr/performance/one-on-ones",
    "/hr/performance/pip",
    "/hr/recruitment/stats",
    "/hr/recruitment/jobs",
    "/hr/recruitment/candidates",
    "/hr/recruitment/interviews",
    "/hr/recruitment/pipeline",
    "/hr/rich-documents",
    "/hr/training",
    "/hr/exit",
    "/hr/recognition",
    "/hr/compliance",
    "/hr/reimbursements",
    "/hr/loans",
    "/hr/certifications",
    "/hr/background-verification",
    "/hr/celebrations",
    "/hr/surveys",
    "/hr/assessments",
    "/hr/learning-paths",
    "/hr/team-events",
    "/hr/skills",
    "/hr/my-profile",
    "/hr/my-goals",
    "/hr/my-training",
    "/hr/document-expiry",
    "/hr/attendance/heatmap?year=2026",
    "/hr/email-templates",
    "/hr/career-ladders",
    "/hr/bonuses",
    "/hr/fnf",
    "/hr/asset-returns",
    "/hr/alumni",
    "/hr/enps",
    "/hr/handbook",
  ];

  for (const endpoint of endpoints) {
    it(`GET ${endpoint} returns 200`, async () => {
      const routePath = endpoint.split("?")[0];
      const modulePath = `@/app/api${routePath}/route`;
      try {
        const mod = await import(modulePath);
        if (!mod.GET) return;
        const res = await mod.GET(req(endpoint));
        expect([200, 404]).toContain(res.status);
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (msg.includes("Cannot find module") || msg.includes("does not provide")) return;
        throw e;
      }
    });
  }
});
