import {
  canUseFeature,
  minPlanFor,
  upgradeMessageFor,
} from "../billing/feature-gates";

/**
 * Mirrors backend `modules/ai/billing/feature-gates.ts` enforcement rules.
 * Backend requireFeature is authoritative; these asserts catch UI drift.
 */
describe("frontend feature gates (backend matrix mirror)", () => {
  it("keeps free plan empty for AI features", () => {
    expect(canUseFeature("FREE", "ai.lead-scoring")).toBe(false);
    expect(canUseFeature("FREE", "ai.email-drafting")).toBe(false);
    expect(canUseFeature("STARTER", "ai.lead-scoring")).toBe(false);
  });

  it("requires Professional for AI lead scoring", () => {
    expect(minPlanFor("ai.lead-scoring")).toBe("PROFESSIONAL");
    expect(canUseFeature("PROFESSIONAL", "ai.lead-scoring")).toBe(true);
    expect(canUseFeature("ENTERPRISE", "ai.lead-scoring")).toBe(true);
  });

  it("allows starter payroll feature flag", () => {
    expect(canUseFeature("STARTER", "hr.payroll")).toBe(true);
    expect(minPlanFor("hr.payroll")).toBe("STARTER");
  });

  it("returns a clear upgrade message (never silent)", () => {
    const msg = upgradeMessageFor("ai.deal-prediction");
    expect(msg.toLowerCase()).toContain("professional");
    expect(msg.toLowerCase()).toContain("upgrade");
  });
});
