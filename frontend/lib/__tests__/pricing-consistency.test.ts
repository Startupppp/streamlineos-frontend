import { PLAN_LIMITS } from "../../../backend/src/modules/billing/plan-entitlements.constants";
import { PRICING } from "../pricing";

describe("public pricing seat limits", () => {
  it("matches the backend Free plan member limit", () => {
    expect(PRICING.starterSeatLimit).toBe(PLAN_LIMITS.members.FREE);
    expect(PRICING.freeSeatLimit).toBe(PLAN_LIMITS.members.FREE);
  });
});
