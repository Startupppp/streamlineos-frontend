import { calendarWorkflowEffectCanReplay } from "./calendar-workflow-effects-card";

describe("calendar workflow effect repair policy", () => {
  it.each(["FAILED", "DEAD_LETTERED"] as const)("allows replay for %s", (status) => {
    expect(calendarWorkflowEffectCanReplay(status)).toBe(true);
  });

  it.each(["PENDING", "IN_FLIGHT", "SUCCEEDED", "SUPPRESSED", "DRY_RUN"] as const)("refuses replay for %s", (status) => {
    expect(calendarWorkflowEffectCanReplay(status)).toBe(false);
  });
});
