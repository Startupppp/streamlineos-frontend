import { riskRowContract, riskPageContract, riskStatsContract } from "@/hooks/api/build/governance-schema";

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

describe("the risks list contract is the keyset page envelope the backend now returns", () => {
  it("parses a page carrying the rows, the hasMore flag and a numeric nextCursor", () => {
    const result = riskPageContract.safeParse({
      data: [BASE_RISK_ROW],
      hasMore: true,
      nextCursor: 42,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null nextCursor, because the last page has no cursor to hand back", () => {
    const result = riskPageContract.safeParse({
      data: [BASE_RISK_ROW],
      hasMore: false,
      nextCursor: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects the old bare array, so a backend that regressed to the unpaginated shape fails loudly instead of rendering an empty register", () => {
    const result = riskPageContract.safeParse([BASE_RISK_ROW]);
    expect(result.success).toBe(false);
  });
});

describe("riskStatsContract keeps the register tiles describing the whole register", () => {
  const BASE_STATS = {
    total: 240,
    open: 91,
    closed: 44,
    highCritical: 17,
    matrix: [{ probability: "high", impact: "high", openCount: 12 }],
  };

  it("accepts the aggregate the stats endpoint returns", () => {
    expect(() => riskStatsContract.parse(BASE_STATS)).not.toThrow();
  });

  it("accepts an empty matrix, because a register with no open risks groups to no rows", () => {
    expect(() => riskStatsContract.parse({ ...BASE_STATS, matrix: [] })).not.toThrow();
  });

  it("rejects a payload missing matrix, so a backend that dropped the aggregate fails loudly instead of rendering an all-zero heat grid", () => {
    const { matrix: _matrix, ...withoutMatrix } = BASE_STATS;
    expect(riskStatsContract.safeParse(withoutMatrix).success).toBe(false);
  });

  it("rejects an out-of-enum probability in a matrix cell, so an unmapped cell cannot silently vanish from the grid", () => {
    const result = riskStatsContract.safeParse({
      ...BASE_STATS,
      matrix: [{ probability: "extreme", impact: "high", openCount: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bare array, so the old first-page-derived tile shape cannot pass as the aggregate", () => {
    expect(riskStatsContract.safeParse([BASE_RISK_ROW]).success).toBe(false);
  });
});
