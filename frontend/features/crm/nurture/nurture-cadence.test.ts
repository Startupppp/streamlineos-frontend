import { MAX_STEP_WAIT_HOURS, MIN_STEP_WAIT_HOURS } from "@/types/crm/nurture";
import {
  cadenceLengthHours,
  cadenceOffsetsHours,
  clampNoticeFor,
  clampWaitHours,
  describeWaitHours,
  stepsToFields,
} from "./nurture-cadence";

describe("clampWaitHours", () => {
  it("raises anything under the floor to the floor", () => {
    expect(clampWaitHours(0)).toBe(MIN_STEP_WAIT_HOURS);
    expect(clampWaitHours(24)).toBe(MIN_STEP_WAIT_HOURS);
    expect(clampWaitHours(MIN_STEP_WAIT_HOURS - 1)).toBe(MIN_STEP_WAIT_HOURS);
  });

  it("lowers anything over the ceiling to the ceiling", () => {
    expect(clampWaitHours(MAX_STEP_WAIT_HOURS + 1)).toBe(MAX_STEP_WAIT_HOURS);
    expect(clampWaitHours(100_000)).toBe(MAX_STEP_WAIT_HOURS);
  });

  it("leaves a wait inside the range alone", () => {
    expect(clampWaitHours(MIN_STEP_WAIT_HOURS)).toBe(MIN_STEP_WAIT_HOURS);
    expect(clampWaitHours(MAX_STEP_WAIT_HOURS)).toBe(MAX_STEP_WAIT_HOURS);
    expect(clampWaitHours(500)).toBe(500);
  });

  it("floors a fraction rather than rounding it", () => {
    expect(clampWaitHours(500.9)).toBe(500);
  });

  it("answers the floor for anything that is not a finite number", () => {
    expect(clampWaitHours(Number.NaN)).toBe(MIN_STEP_WAIT_HOURS);
    expect(clampWaitHours(Number.POSITIVE_INFINITY)).toBe(MIN_STEP_WAIT_HOURS);
    expect(clampWaitHours(Number.NEGATIVE_INFINITY)).toBe(MIN_STEP_WAIT_HOURS);
  });
});

describe("describeWaitHours", () => {
  it("reads whole days as days", () => {
    expect(describeWaitHours(24)).toBe("1 day");
    expect(describeWaitHours(240)).toBe("10 days");
  });

  it("reads a part-day as days and hours", () => {
    expect(describeWaitHours(250)).toBe("10 days 10 hours");
    expect(describeWaitHours(25)).toBe("1 day 1 hour");
  });

  it("reads under a day as hours", () => {
    expect(describeWaitHours(1)).toBe("1 hour");
    expect(describeWaitHours(18)).toBe("18 hours");
  });

  it("calls nothing nothing", () => {
    expect(describeWaitHours(0)).toBe("no wait");
    expect(describeWaitHours(Number.NaN)).toBe("no wait");
  });
});

describe("clampNoticeFor", () => {
  it("says nothing when the typed wait is the wait that runs", () => {
    expect(clampNoticeFor(MIN_STEP_WAIT_HOURS)).toBeNull();
    expect(clampNoticeFor(720)).toBeNull();
  });

  it("explains that a tighter cadence would be drafted and never sent", () => {
    const notice = clampNoticeFor(48);
    expect(notice).toContain("10 days");
    expect(notice).toContain("never sent");
  });

  it("explains the ceiling in the same terms", () => {
    const notice = clampNoticeFor(MAX_STEP_WAIT_HOURS + 100);
    expect(notice).toContain("90 days");
    expect(notice).toContain("longest");
  });

  it("says nothing about a value it cannot read", () => {
    expect(clampNoticeFor(Number.NaN)).toBeNull();
  });
});

describe("cadenceOffsetsHours", () => {
  it("accumulates the waits the sender will actually keep", () => {
    expect(cadenceOffsetsHours([{ waitHours: 240 }, { waitHours: 240 }])).toEqual([240, 480]);
  });

  it("accumulates a too-tight wait at the floor, not at what was typed", () => {
    expect(cadenceOffsetsHours([{ waitHours: 1 }, { waitHours: 1 }])).toEqual([240, 480]);
  });

  it("is empty for an empty cadence", () => {
    expect(cadenceOffsetsHours([])).toEqual([]);
    expect(cadenceLengthHours([])).toBe(0);
  });

  it("reports the whole cadence length as the last offset", () => {
    expect(cadenceLengthHours([{ waitHours: 240 }, { waitHours: 480 }])).toBe(720);
  });
});

describe("stepsToFields", () => {
  it("orders by step number rather than trusting arrival order", () => {
    const fields = stepsToFields([
      { nurtureStepId: "c", stepNumber: 3, waitHours: 720 },
      { nurtureStepId: "a", stepNumber: 1, waitHours: 240 },
      { nurtureStepId: "b", stepNumber: 2, waitHours: 480 },
    ]);

    expect(fields).toEqual([{ waitHours: "240" }, { waitHours: "480" }, { waitHours: "720" }]);
  });
});
