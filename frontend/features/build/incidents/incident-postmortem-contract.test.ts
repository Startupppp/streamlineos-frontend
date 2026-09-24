import {
  incidentRowContract,
  incidentDetailContract,
  incidentFollowUpActionRowContract,
  incidentDecisionRowContract,
} from "@/hooks/api/build/incidents-schema";
import { unresolvedFollowUpCount } from "./incident-follow-ups";

const ROW = {
  id: 1,
  orgId: "org_1",
  projectId: 7,
  incidentNumber: 12,
  title: "Payments outage",
  description: null,
  severity: "critical",
  status: "postmortem",
  impact: null,
  ownerId: null,
  rootCause: null,
  customerComms: null,
  detectedAt: "2026-01-01T00:00:00.000Z",
  respondedAt: null,
  resolvedAt: null,
  responseDueAt: null,
  resolutionDueAt: null,
  linkedTicketId: null,
  releaseId: 44,
  createdBy: "user_1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

const DECISION = {
  id: 3,
  orgId: "org_1",
  incidentId: 1,
  decision: "Fail over to the secondary region",
  rationale: "Primary region write latency exceeded the error budget",
  decidedBy: "user_1",
  createdAt: "2026-01-01T01:00:00.000Z",
};

const FOLLOW_UP = {
  id: 9,
  orgId: "org_1",
  incidentId: 1,
  title: "Add a write-latency alert",
  description: null,
  ownerId: "user_2",
  status: "open",
  dueAt: "2026-02-01T00:00:00.000Z",
  createdBy: "user_1",
  createdAt: "2026-01-01T02:00:00.000Z",
  updatedAt: "2026-01-01T02:00:00.000Z",
};

describe("incident row contract carries the release correlation", () => {
  it("keeps releaseId instead of stripping it as an unknown key", () => {
    const parsed = incidentRowContract.parse(ROW);
    expect(parsed.releaseId).toBe(44);
  });

  it("keeps createdBy instead of stripping it as an unknown key", () => {
    expect(incidentRowContract.parse(ROW).createdBy).toBe("user_1");
  });
});

describe("incident detail contract carries the postmortem collections", () => {
  it("keeps the decisions array instead of stripping it as an unknown key", () => {
    const parsed = incidentDetailContract.parse({
      ...ROW,
      updates: [],
      decisions: [DECISION],
      followUpActions: [],
    });
    expect(parsed.decisions).toHaveLength(1);
    expect(parsed.decisions[0]?.decision).toBe("Fail over to the secondary region");
  });

  it("keeps the followUpActions array instead of stripping it as an unknown key", () => {
    const parsed = incidentDetailContract.parse({
      ...ROW,
      updates: [],
      decisions: [],
      followUpActions: [FOLLOW_UP],
    });
    expect(parsed.followUpActions).toHaveLength(1);
    expect(parsed.followUpActions[0]?.title).toBe("Add a write-latency alert");
  });

  it("rejects a detail payload missing the postmortem collections", () => {
    expect(incidentDetailContract.safeParse({ ...ROW, updates: [] }).success).toBe(false);
  });
});

describe("incident enum fields are pinned to the Postgres enum values", () => {
  it("accepts every incident_status value the database can produce", () => {
    for (const status of [
      "detected",
      "investigating",
      "mitigating",
      "resolved",
      "postmortem",
      "closed",
    ]) {
      expect(incidentRowContract.safeParse({ ...ROW, status }).success).toBe(true);
    }
  });

  it("accepts every incident_severity value the database can produce", () => {
    for (const severity of ["critical", "high", "medium", "low"]) {
      expect(incidentRowContract.safeParse({ ...ROW, severity }).success).toBe(true);
    }
  });

  it("rejects a status outside the incident_status enum", () => {
    expect(incidentRowContract.safeParse({ ...ROW, status: "triaged" }).success).toBe(false);
  });

  it("rejects a severity outside the incident_severity enum", () => {
    expect(incidentRowContract.safeParse({ ...ROW, severity: "sev1" }).success).toBe(false);
  });

  it("accepts every incident_follow_up_status value the database can produce", () => {
    for (const status of ["open", "in_progress", "done", "cancelled"]) {
      expect(incidentFollowUpActionRowContract.safeParse({ ...FOLLOW_UP, status }).success).toBe(
        true,
      );
    }
  });

  it("rejects a follow-up status outside the incident_follow_up_status enum", () => {
    expect(
      incidentFollowUpActionRowContract.safeParse({ ...FOLLOW_UP, status: "blocked" }).success,
    ).toBe(false);
  });

  it("parses a decision row with a null rationale", () => {
    expect(incidentDecisionRowContract.parse({ ...DECISION, rationale: null }).rationale).toBeNull();
  });
});

describe("unresolvedFollowUpCount mirrors the backend close policy", () => {
  it("counts open and in_progress follow-ups", () => {
    const actions = [
      { ...FOLLOW_UP, id: 1, status: "open" as const },
      { ...FOLLOW_UP, id: 2, status: "in_progress" as const },
      { ...FOLLOW_UP, id: 3, status: "done" as const },
      { ...FOLLOW_UP, id: 4, status: "cancelled" as const },
    ];
    expect(unresolvedFollowUpCount(actions)).toBe(2);
  });

  it("returns zero when every follow-up is done or cancelled", () => {
    const actions = [
      { ...FOLLOW_UP, id: 1, status: "done" as const },
      { ...FOLLOW_UP, id: 2, status: "cancelled" as const },
    ];
    expect(unresolvedFollowUpCount(actions)).toBe(0);
  });
});
