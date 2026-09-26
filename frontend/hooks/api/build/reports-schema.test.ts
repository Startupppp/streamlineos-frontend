import * as reportsSchema from "./reports-schema";
import {
  velocityContract,
  burnupDataContract,
  cfdDataContract,
  cycleTimeContract,
  leadTimeContract,
  criticalPathContract,
  snapshotResultContract,
} from "./reports-schema";

describe("reports-schema — does not shadow workspace-schema's analyticsContract", () => {
  it("does not re-export analyticsContract, which would give /build/:projectId/analytics two competing frontend contracts", () => {
    expect("analyticsContract" in reportsSchema).toBe(false);
  });
});

const BASE_VELOCITY_SPRINT = {
  cycleId: 1,
  name: "Sprint 1",
  startDate: "2026-01-01",
  endDate: "2026-01-14",
  committedPoints: 40,
  completedPoints: 35,
  committedCount: 8,
  completedCount: 7,
};

describe("velocityContract — velocity data from /reports/velocity", () => {
  it("accepts a single-cycle array", () => {
    expect(() => velocityContract.parse([BASE_VELOCITY_SPRINT])).not.toThrow();
  });

  it("accepts an empty array so a project with no cycles renders the empty state", () => {
    expect(() => velocityContract.parse([])).not.toThrow();
  });

  it("rejects an array over 100 items so an unbound query cannot slip past the contract", () => {
    const over = Array.from({ length: 101 }, (_, i) => ({
      ...BASE_VELOCITY_SPRINT,
      cycleId: i + 1,
    }));
    const result = velocityContract.safeParse(over);
    expect(result.success).toBe(false);
  });

  it("rejects a cycle with a missing name so a row with an undefined name cannot reach the chart axis", () => {
    const { name: _name, ...withoutName } = BASE_VELOCITY_SPRINT;
    expect(velocityContract.safeParse([withoutName]).success).toBe(false);
  });

  it("accepts 100 cycles, the server page cap, so a full page does not silently drop", () => {
    const exactly100 = Array.from({ length: 100 }, (_, i) => ({
      ...BASE_VELOCITY_SPRINT,
      cycleId: i + 1,
    }));
    expect(() => velocityContract.parse(exactly100)).not.toThrow();
  });
});

const BASE_BURNUP_POINT = {
  date: "2026-01-01",
  scope: 80,
  completed: 12,
};

describe("burnupDataContract — burnup series from /reports/burnup", () => {
  it("accepts a valid burnup series", () => {
    expect(() => burnupDataContract.parse([BASE_BURNUP_POINT])).not.toThrow();
  });

  it("accepts an empty series so a project with no tickets renders the empty state", () => {
    expect(() => burnupDataContract.parse([])).not.toThrow();
  });

  it("rejects a series over 366 points so a multi-year unbounded query fails loudly instead of silently truncating", () => {
    const over = Array.from({ length: 367 }, (_, i) => ({
      ...BASE_BURNUP_POINT,
      date: `2026-${String(Math.floor(i / 31) + 1).padStart(2, "0")}-01`,
    }));
    const result = burnupDataContract.safeParse(over);
    expect(result.success).toBe(false);
  });

  it("accepts exactly 366 points, the maximum year window", () => {
    const exactly366 = Array.from({ length: 366 }, (_, i) => ({
      ...BASE_BURNUP_POINT,
      date: `2026-${String(Math.floor(i / 31) + 1).padStart(2, "0")}-01`,
    }));
    expect(() => burnupDataContract.parse(exactly366)).not.toThrow();
  });

  it("rejects a point with a missing scope so a row without a scope value cannot produce a flat line that looks correct", () => {
    const { scope: _scope, ...withoutScope } = BASE_BURNUP_POINT;
    expect(burnupDataContract.safeParse([withoutScope]).success).toBe(false);
  });
});

const BASE_CFD_DATA = {
  dates: ["2026-01-01", "2026-01-02"],
  groups: ["backlog", "started", "completed"],
  series: [
    {
      date: "2026-01-01",
      backlog: 10,
      unstarted: 3,
      started: 2,
      completed: 1,
      cancelled: 0,
    },
    {
      date: "2026-01-02",
      backlog: 9,
      unstarted: 3,
      started: 3,
      completed: 2,
      cancelled: 0,
    },
  ],
};

describe("cfdDataContract — cumulative flow diagram from /reports/cfd", () => {
  it("accepts a valid cfd payload", () => {
    expect(() => cfdDataContract.parse(BASE_CFD_DATA)).not.toThrow();
  });

  it("accepts a cfd payload with empty dates and series so a new project renders the empty state", () => {
    expect(() =>
      cfdDataContract.parse({ dates: [], groups: [], series: [] }),
    ).not.toThrow();
  });

  it("rejects a bare array so a backend regression returning the old shape fails loudly instead of silently rendering an empty flow chart", () => {
    expect(cfdDataContract.safeParse([BASE_CFD_DATA]).success).toBe(false);
  });

  it("rejects a cfd payload missing the series array so a partial backend response fails loudly", () => {
    const { series: _series, ...withoutSeries } = BASE_CFD_DATA;
    expect(cfdDataContract.safeParse(withoutSeries).success).toBe(false);
  });

  it("rejects a series point with a missing cancelled field so every flow band is always present", () => {
    const badSeries = [
      {
        date: "2026-01-01",
        backlog: 10,
        unstarted: 3,
        started: 2,
        completed: 1,
      },
    ];
    expect(
      cfdDataContract.safeParse({ ...BASE_CFD_DATA, series: badSeries }).success,
    ).toBe(false);
  });
});

const BASE_CYCLE_TIME_WEEK = {
  week: "2026-01-05",
  avgDays: 3.2,
  count: 7,
};

describe("cycleTimeContract — cycle time series from /reports/cycle-time", () => {
  it("accepts a valid cycle time series", () => {
    expect(() => cycleTimeContract.parse([BASE_CYCLE_TIME_WEEK])).not.toThrow();
  });

  it("accepts an empty series so a project with no completed work renders the empty state", () => {
    expect(() => cycleTimeContract.parse([])).not.toThrow();
  });

  it("rejects a week with a missing avgDays so a row cannot reach the chart with an undefined y-axis value", () => {
    const { avgDays: _avgDays, ...withoutAvg } = BASE_CYCLE_TIME_WEEK;
    expect(cycleTimeContract.safeParse([withoutAvg]).success).toBe(false);
  });

  it("rejects a bare object so a backend regression returning a single object instead of an array fails loudly", () => {
    expect(cycleTimeContract.safeParse(BASE_CYCLE_TIME_WEEK).success).toBe(false);
  });
});

const BASE_LEAD_TIME_WEEK = {
  week: "2026-01-05",
  avgDays: 5.1,
  p50Days: 4.0,
  p90Days: 9.5,
  count: 11,
};

describe("leadTimeContract — lead time series from /reports/lead-time", () => {
  it("accepts a valid lead time series", () => {
    expect(() => leadTimeContract.parse([BASE_LEAD_TIME_WEEK])).not.toThrow();
  });

  it("accepts an empty series so a project with no delivery renders the empty state", () => {
    expect(() => leadTimeContract.parse([])).not.toThrow();
  });

  it("rejects a week missing p50Days so the percentile line cannot be silently absent from the chart", () => {
    const { p50Days: _p50, ...withoutP50 } = BASE_LEAD_TIME_WEEK;
    expect(leadTimeContract.safeParse([withoutP50]).success).toBe(false);
  });

  it("rejects a week missing p90Days so the tail-latency line cannot be silently absent", () => {
    const { p90Days: _p90, ...withoutP90 } = BASE_LEAD_TIME_WEEK;
    expect(leadTimeContract.safeParse([withoutP90]).success).toBe(false);
  });
});

const BASE_CRITICAL_PATH = {
  criticalPath: [
    {
      ticketId: 42,
      title: "Implement auth service",
      estimate: 5,
      earliestStart: 0,
      earliestFinish: 5,
    },
  ],
  totalDuration: 5,
  nodeCount: 3,
  edgeCount: 2,
  hasCycle: false,
};

describe("criticalPathContract — critical path from /reports/critical-path", () => {
  it("accepts a valid critical path payload", () => {
    expect(() => criticalPathContract.parse(BASE_CRITICAL_PATH)).not.toThrow();
  });

  it("accepts an empty critical path so a project with no dependencies renders the empty state", () => {
    expect(() =>
      criticalPathContract.parse({
        criticalPath: [],
        totalDuration: 0,
        nodeCount: 0,
        edgeCount: 0,
        hasCycle: false,
      }),
    ).not.toThrow();
  });

  it("accepts hasCycle:true so a graph with circular dependencies renders a cycle warning rather than crashing", () => {
    expect(() =>
      criticalPathContract.parse({ ...BASE_CRITICAL_PATH, hasCycle: true }),
    ).not.toThrow();
  });

  it("rejects a bare array so a backend regression returning the wrong shape fails loudly instead of silently rendering a broken graph", () => {
    expect(criticalPathContract.safeParse([BASE_CRITICAL_PATH]).success).toBe(false);
  });

  it("rejects a payload missing hasCycle so a missing cycle detection flag cannot silently default to false", () => {
    const { hasCycle: _hasCycle, ...withoutCycle } = BASE_CRITICAL_PATH;
    expect(criticalPathContract.safeParse(withoutCycle).success).toBe(false);
  });

  it("rejects a critical path node missing title so a node cannot render a blank label on the chart", () => {
    const badPath = [{ ticketId: 1, estimate: 2, earliestStart: 0, earliestFinish: 2 }];
    expect(
      criticalPathContract.safeParse({ ...BASE_CRITICAL_PATH, criticalPath: badPath }).success,
    ).toBe(false);
  });
});

describe("snapshotResultContract — snapshot trigger from /reports/snapshot", () => {
  it("accepts a valid capture count", () => {
    expect(() => snapshotResultContract.parse({ captured: 42 })).not.toThrow();
  });

  it("accepts captured:0 so a snapshot with no new data points does not fail validation", () => {
    expect(() => snapshotResultContract.parse({ captured: 0 })).not.toThrow();
  });

  it("rejects a bare number so a backend that returns a count without a wrapper fails loudly", () => {
    expect(snapshotResultContract.safeParse(42).success).toBe(false);
  });
});
