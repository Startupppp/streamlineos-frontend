import { riskRowContract } from "@/hooks/api/build/governance-schema";

const BASE_RISK_ROW = {
  id: 1,
  orgId: "org_1",
  projectId: 10,
  riskNumber: 1,
  title: "Sample risk",
  description: null,
  probability: "medium",
  impact: "medium",
  status: "open",
  ownerId: null,
  mitigation: null,
  linkedTicketId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

describe("riskRowContract enum fields match the risk_probability/risk_impact/risk_status Postgres enums", () => {
  it.each(["low", "medium", "high"] as const)(
    "accepts %s as a real probability and impact value",
    (level) => {
      expect(() =>
        riskRowContract.parse({ ...BASE_RISK_ROW, probability: level, impact: level }),
      ).not.toThrow();
    },
  );

  it.each(["open", "mitigating", "monitoring", "accepted", "closed"] as const)(
    "accepts %s as a real status value",
    (status) => {
      expect(() => riskRowContract.parse({ ...BASE_RISK_ROW, status })).not.toThrow();
    },
  );

  it("rejects an out-of-enum probability so it can never reach getRiskSeverity and be scored as Critical", () => {
    const result = riskRowContract.safeParse({ ...BASE_RISK_ROW, probability: "extreme" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-enum impact so it can never reach getRiskSeverity and be scored as Critical", () => {
    const result = riskRowContract.safeParse({ ...BASE_RISK_ROW, impact: "extreme" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-enum status rather than rendering an undefined status badge", () => {
    const result = riskRowContract.safeParse({ ...BASE_RISK_ROW, status: "cancelled" });
    expect(result.success).toBe(false);
  });
});
