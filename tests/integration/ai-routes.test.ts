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

// Mock AI modules — prevent real OpenAI calls
vi.mock("@/lib/ai/lead-scoring", () => ({
  aiScoreLead: vi.fn().mockResolvedValue({ score: 75, reasoning: "Good fit" }),
  aiBatchScoreLeads: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/ai/email-generator", () => ({
  generateFollowUpEmail: vi.fn().mockResolvedValue({ subject: "Follow up", body: "Hi there" }),
  generateEmailVariations: vi.fn().mockResolvedValue([
    { tone: "formal", subject: "Follow up", body: "Dear..." },
    { tone: "friendly", subject: "Hey!", body: "Hi..." },
    { tone: "urgent", subject: "Urgent", body: "Please..." },
  ]),
}));

vi.mock("@/lib/ai/deal-predictor", () => ({
  predictDealOutcome: vi.fn().mockResolvedValue({ probability: 65, reasoning: "Good pipeline" }),
}));

vi.mock("@/lib/ai/next-action", () => ({
  suggestNextAction: vi.fn().mockResolvedValue({ action: "Schedule call", reasoning: "Follow up needed" }),
}));

vi.mock("@/lib/ai/summarize", () => ({
  summarizeEntity: vi.fn().mockResolvedValue({ summary: "Lead from referral" }),
}));

vi.mock("@/lib/ai/lead-enrichment", () => ({
  enrichLead: vi.fn().mockResolvedValue({ company: "Acme Corp", industry: "Tech" }),
}));

vi.mock("@/lib/ai/churn-risk", () => ({
  assessChurnRisk: vi.fn().mockResolvedValue({ risk: 0.3, reasoning: "Low engagement" }),
}));

vi.mock("@/lib/ai/openai", () => ({
  isOpenAIConfigured: vi.fn(() => true),
}));

describe("POST /api/ai/score-lead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates leadId is required", async () => {
    const { POST } = await import("@/app/api/ai/score-lead/route");
    const req = new NextRequest("http://localhost/api/ai/score-lead", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { POST } = await import("@/app/api/ai/score-lead/route");
    const req = new NextRequest("http://localhost/api/ai/score-lead", {
      method: "POST",
      body: JSON.stringify({ leadId: 1 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ai/generate-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates leadName is required", async () => {
    const { POST } = await import("@/app/api/ai/generate-email/route");
    const req = new NextRequest("http://localhost/api/ai/generate-email", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("validates tone enum", async () => {
    const { POST } = await import("@/app/api/ai/generate-email/route");
    const req = new NextRequest("http://localhost/api/ai/generate-email", {
      method: "POST",
      body: JSON.stringify({ leadName: "John", tone: "INVALID_TONE" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { POST } = await import("@/app/api/ai/generate-email/route");
    const req = new NextRequest("http://localhost/api/ai/generate-email", {
      method: "POST",
      body: JSON.stringify({ leadName: "John" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ai/predict-deal", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { POST } = await import("@/app/api/ai/predict-deal/route");
    const req = new NextRequest("http://localhost/api/ai/predict-deal", {
      method: "POST",
      body: JSON.stringify({ dealId: 1 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ai/summarize", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { POST } = await import("@/app/api/ai/summarize/route");
    const req = new NextRequest("http://localhost/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ entityId: 1, entityType: "lead" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
