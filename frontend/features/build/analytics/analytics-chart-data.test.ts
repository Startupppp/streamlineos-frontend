jest.mock("./project-charts", () => ({
  STATE_COLORS: { done: "#4ade80", in_progress: "#60a5fa" },
  PRIORITY_COLORS: { high: "#f87171", low: "#94a3b8" },
}));

import {
  MUTED_FILL,
  buildStateData,
  buildPriorityData,
  buildVolumeData,
  buildAssigneeData,
  buildVelocityData,
  buildEstimateData,
} from "./analytics-chart-data";

const BASE = {
  stateDistribution: [
    { status: "DONE", count: 5 },
    { status: "IN_PROGRESS", count: 2 },
    { status: null, count: 1 },
  ],
  priorityBreakdown: [
    { priority: "high", count: 3 },
    { priority: null, count: 1 },
  ],
  volumeOverTime: [
    { week: "2026-01-05", count: 4 },
    { week: null, count: 2 },
  ],
  assigneeCompletion: [
    { assigneeId: "u1", assigneeName: "Ada", total: 10, completed: 8 },
    { assigneeId: null, assigneeName: null, total: 0, completed: 0 },
  ],
  cycleVelocity: [
    { cycleId: 1, cycleName: "Sprint 1", completedPoints: 13 },
    { cycleId: 2, cycleName: null, completedPoints: 5 },
  ],
  estimateVsActual: [
    { ticketId: 1, title: "Card A", estimated: "3", actual: 4 },
    { ticketId: 2, title: "", estimated: null, actual: 2 },
    { ticketId: 3, title: "Card C", estimated: "not-a-number", actual: 1 },
  ],
};

describe("buildStateData — state distribution transform", () => {
  it("returns an empty array when analytics is undefined", () => {
    expect(buildStateData(undefined)).toEqual([]);
  });

  it("maps the known colour and passes count through", () => {
    const rows = buildStateData(BASE as never);
    expect(rows[0]).toMatchObject({ count: 5, fill: "#4ade80" });
  });

  it("replaces underscores with spaces", () => {
    const rows = buildStateData(BASE as never);
    expect(rows[1].state).toBe("IN PROGRESS");
  });

  it("falls back to MUTED_FILL for an unknown status", () => {
    const rows = buildStateData(BASE as never);
    expect(rows[2].fill).toBe(MUTED_FILL);
  });
});

describe("buildPriorityData — priority breakdown transform", () => {
  it("returns empty when analytics is undefined", () => {
    expect(buildPriorityData(undefined)).toEqual([]);
  });

  it("capitalises priority and maps the known colour", () => {
    const rows = buildPriorityData(BASE as never);
    expect(rows[0]).toMatchObject({ name: "High", value: 3, fill: "#f87171" });
  });

  it("falls back to MUTED_FILL for a null priority", () => {
    const rows = buildPriorityData(BASE as never);
    expect(rows[1].fill).toBe(MUTED_FILL);
  });
});

describe("buildVolumeData — volume over time transform", () => {
  it("returns empty when analytics is undefined", () => {
    expect(buildVolumeData(undefined)).toEqual([]);
  });

  it("maps week to date and count to created", () => {
    const rows = buildVolumeData(BASE as never);
    expect(rows[0]).toEqual({ date: "2026-01-05", created: 4 });
  });

  it("coerces a null week to an empty string", () => {
    const rows = buildVolumeData(BASE as never);
    expect(rows[1].date).toBe("");
  });
});

describe("buildAssigneeData — assignee completion transform", () => {
  it("returns empty when analytics is undefined", () => {
    expect(buildAssigneeData(undefined)).toEqual([]);
  });

  it("computes completion rate as a rounded percentage", () => {
    const rows = buildAssigneeData(BASE as never);
    expect(rows[0]).toMatchObject({ name: "Ada", completed: 8, total: 10, rate: 80 });
  });

  it("sets rate to 0 when total is zero to avoid division by zero", () => {
    const rows = buildAssigneeData(BASE as never);
    expect(rows[1].rate).toBe(0);
  });

  it("falls back to Unassigned for a null assigneeName", () => {
    const rows = buildAssigneeData(BASE as never);
    expect(rows[1].name).toBe("Unassigned");
  });
});

describe("buildVelocityData — cycle velocity transform", () => {
  it("returns empty when analytics is undefined", () => {
    expect(buildVelocityData(undefined)).toEqual([]);
  });

  it("maps cycleName to cycle and completedPoints to points", () => {
    const rows = buildVelocityData(BASE as never);
    expect(rows[0]).toEqual({ cycle: "Sprint 1", points: 13 });
  });

  it("falls back to 'Deleted cycle' when cycleName is null", () => {
    const rows = buildVelocityData(BASE as never);
    expect(rows[1].cycle).toBe("Deleted cycle");
  });
});

describe("buildEstimateData — estimate vs actual transform", () => {
  it("returns empty when analytics is undefined", () => {
    expect(buildEstimateData(undefined)).toEqual([]);
  });

  it("uses title as label and parses estimated as float", () => {
    const rows = buildEstimateData(BASE as never);
    expect(rows[0]).toMatchObject({ label: "Card A", estimate: 3, actual: 4 });
  });

  it("falls back to #ticketId label when title is empty", () => {
    const rows = buildEstimateData(BASE as never);
    expect(rows[1].label).toBe("#2");
  });

  it("sets estimate to 0 when estimated is null", () => {
    const rows = buildEstimateData(BASE as never);
    expect(rows[1].estimate).toBe(0);
  });

  it("sets estimate to NaN when estimated is a non-numeric string (parseFloat behaviour)", () => {
    const rows = buildEstimateData(BASE as never);
    expect(Number.isNaN(rows[2].estimate)).toBe(true);
  });
});
