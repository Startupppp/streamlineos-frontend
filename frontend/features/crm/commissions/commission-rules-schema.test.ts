import { DEFAULT_RULES, fromRuleSet, ruleSetFormSchema, toRuleSet } from "./commission-rules-schema";

describe("commission rules form", () => {
  it("converts percentages and amounts to integer bps and minor units", () => {
    const rules = toRuleSet(
      {
        period: "QUARTER",
        quota: "100000",
        cap: "",
        tiers: [
          { from: "0", ratePercent: "5" },
          { from: "100", ratePercent: "7.5" },
        ],
        accelerators: [{ abovePercent: "120", multiplier: "1.25" }],
      },
      "INR",
    );
    expect(rules).toEqual({
      basis: "deal_value",
      period: "QUARTER",
      quotaMinor: 10_000_000,
      capMinor: null,
      tiers: [
        { from: 0, rateBps: 500 },
        { from: 10_000, rateBps: 750 },
      ],
      accelerators: [{ aboveBps: 12_000, multiplierBps: 12_500 }],
    });
    expect(fromRuleSet(rules, "INR").tiers[1]).toEqual({ from: "100", ratePercent: "7.5" });
  });

  it("reads tier bounds as money when there is no quota", () => {
    const rules = toRuleSet({ ...DEFAULT_RULES, tiers: [{ from: "0", ratePercent: "5" }, { from: "500", ratePercent: "8" }] }, "INR");
    expect(rules.tiers[1].from).toBe(50_000);
  });

  it("rejects what the backend would refuse, on the field", () => {
    const result = ruleSetFormSchema.safeParse({
      ...DEFAULT_RULES,
      tiers: [{ from: "10", ratePercent: "5" }, { from: "5", ratePercent: "5" }],
      accelerators: [{ abovePercent: "110", multiplier: "1.5" }],
    });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "tiers.0.from",
      "tiers.1.from",
      "accelerators.0.abovePercent",
    ]);
  });
});
