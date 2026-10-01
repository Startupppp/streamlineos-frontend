import { summariseCycle, type CycleSummaryInput } from "./readiness-summary";

function input(overrides: Partial<CycleSummaryInput> = {}): CycleSummaryInput {
  return {
    isLoading: false,
    isStale: false,
    blockers: 0,
    blockedPeople: 0,
    blockedPeopleIsComplete: true,
    waived: 0,
    population: { inCycle: 212, isComplete: true },
    ...overrides,
  };
}

describe("the cycle population is now measured from a server total, not a page length", () => {
  it("reports the whole cycle even when the roster pages, which used to force it unmeasured", () => {
    const summary = summariseCycle(input());

    expect(summary.inCycle).toBe(212);
    expect(summary.state).toBe("ready");
  });

  it("still refuses to report a population the read has not delivered", () => {
    const summary = summariseCycle(
      input({ population: { inCycle: 0, isComplete: false } }),
    );

    expect(summary.inCycle).toBeNull();
    expect(summary.ready).toBeNull();
    expect(summary.state).not.toBe("ready");
  });
});

describe("ready is withheld whenever its subtrahend is only a floor", () => {
  it("counts the clear population when both the roster and the blocker list are complete", () => {
    const summary = summariseCycle(input({ blockers: 4, blockedPeople: 4 }));

    expect(summary.ready).toBe(208);
  });

  it("reports no ready figure when the blocker list was truncated, because blockedPeople is then a floor", () => {
    const summary = summariseCycle(
      input({ blockers: 4, blockedPeople: 4, blockedPeopleIsComplete: false }),
    );

    expect(summary.ready).toBeNull();
  });

  it("never lets a truncated blocker list inflate ready above the measured clear count", () => {
    const complete = summariseCycle(input({ blockers: 60, blockedPeople: 60 }));
    const truncated = summariseCycle(
      input({ blockers: 60, blockedPeople: 25, blockedPeopleIsComplete: false }),
    );

    expect(complete.ready).toBe(152);
    expect(truncated.ready).toBeNull();
    expect(truncated.ready).not.toBe(187);
  });

  it("keeps blocked and waived reported even while ready is withheld, so the screen is not blank", () => {
    const summary = summariseCycle(
      input({ blockers: 4, blockedPeople: 2, waived: 1, blockedPeopleIsComplete: false }),
    );

    expect(summary.blockers).toBe(4);
    expect(summary.blockedPeople).toBe(2);
    expect(summary.waived).toBe(1);
    expect(summary.ready).toBeNull();
  });
});

describe("the states that must never resolve to ready", () => {
  it("a blocked cycle is blocked, whatever the population says", () => {
    expect(summariseCycle(input({ blockers: 3 })).state).toBe("blocked");
    expect(summariseCycle(input({ blockers: 3 })).isAllClear).toBe(false);
  });

  it("an empty cycle is not in cycle rather than ready", () => {
    const summary = summariseCycle(input({ population: { inCycle: 0, isComplete: true } }));

    expect(summary.state).toBe("not-in-cycle");
    expect(summary.isAllClear).toBe(false);
  });

  it("an unread roster is unmeasured, never an empty cycle", () => {
    const summary = summariseCycle(input({ population: { inCycle: 0, isComplete: false } }));

    expect(summary.state).toBe("unmeasured");
    expect(summary.state).not.toBe("not-in-cycle");
    expect(summary.headline).toMatch(/number of employees in it is not/i);
  });

  it("says which half is unmeasured, so the reader knows what to go and check", () => {
    const noPopulation = summariseCycle(input({ population: { inCycle: 0, isComplete: false } }));
    const noBlockers = summariseCycle(input({ blockedPeopleIsComplete: false }));

    expect(noPopulation.headline).toMatch(/number of employees in it is not/i);
    expect(noBlockers.headline).toMatch(/every blocker has been seen is not/i);
  });

  it("still calls a cycle blocked on a partial blocker list, because a non-zero floor is proof", () => {
    const summary = summariseCycle(input({ blockers: 7, blockedPeopleIsComplete: false }));

    expect(summary.state).toBe("blocked");
    expect(summary.ready).toBeNull();
  });

  it("a loading read is unmeasured, not ready", () => {
    expect(summariseCycle(input({ isLoading: true })).state).toBe("unmeasured");
  });

  it("a stale read is stale, not ready", () => {
    expect(summariseCycle(input({ isStale: true })).state).toBe("stale");
  });
});
