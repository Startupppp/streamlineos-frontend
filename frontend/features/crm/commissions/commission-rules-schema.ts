import { z } from "zod";
import { majorToMinor, minorToMajor } from "@/lib/accounting/money";
import type { CreateCommissionPlanInput } from "@/hooks/api/crm/commission";
import type { CommissionRuleSet } from "@/hooks/api/crm/commission-schema";
import { BPS_SCALE } from "./commission-format";


const decimal = (message: string) =>
  z.string().trim().refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, message);
const optionalDecimal = (message: string) =>
  z.string().trim().refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) > 0), message);

export const ruleSetFormSchema = z
  .object({
    period: z.enum(["MONTH", "QUARTER", "YEAR"]),
    quota: optionalDecimal("A positive amount, or blank for no quota"),
    cap: optionalDecimal("A positive amount, or blank for no cap"),
    tiers: z
      .array(
        z.object({
          from: decimal("0 or more"),
          ratePercent: decimal("0 to 100").refine((value) => Number(value) <= 100, "0 to 100"),
        }),
      )
      .min(1, "Add at least one tier")
      .max(20),
    accelerators: z
      .array(
        z.object({
          abovePercent: decimal("0 or more"),
          multiplier: decimal("Between 0.0001 and 5").refine(
            (value) => Number(value) > 0 && Number(value) <= 5,
            "Between 0.0001 and 5",
          ),
        }),
      )
      .max(10),
  })
  .superRefine((value, ctx) => {
    if (value.tiers[0] && Number(value.tiers[0].from) !== 0)
      ctx.addIssue({ code: "custom", path: ["tiers", 0, "from"], message: "The first tier starts at 0" });
    for (let i = 1; i < value.tiers.length; i += 1)
      if (Number(value.tiers[i].from) <= Number(value.tiers[i - 1].from))
        ctx.addIssue({ code: "custom", path: ["tiers", i, "from"], message: "Must be above the tier before it" });
    const seen = new Set<number>();
    value.accelerators.forEach((accelerator, i) => {
      const above = Number(accelerator.abovePercent);
      if (seen.has(above))
        ctx.addIssue({ code: "custom", path: ["accelerators", i, "abovePercent"], message: "Two accelerators at one threshold" });
      seen.add(above);
      if (value.quota === "" && above > 0)
        ctx.addIssue({ code: "custom", path: ["accelerators", i, "abovePercent"], message: "A threshold needs a quota" });
    });
  });

export type RuleSetFormValues = z.infer<typeof ruleSetFormSchema>;

export const DEFAULT_RULES: RuleSetFormValues = {
  period: "MONTH",
  quota: "",
  cap: "",
  tiers: [{ from: "0", ratePercent: "5" }],
  accelerators: [],
};

const toBps = (percent: string) => Math.round(Number(percent) * (BPS_SCALE / 100));
const fromBps = (bps: number) => String(bps / (BPS_SCALE / 100));

export function toRuleSet(values: RuleSetFormValues, currency: string): CreateCommissionPlanInput["rules"] {
  const quotaBased = values.quota !== "";
  return {
    basis: "deal_value",
    period: values.period,
    quotaMinor: quotaBased ? majorToMinor(Number(values.quota), currency) : null,
    capMinor: values.cap !== "" ? majorToMinor(Number(values.cap), currency) : null,
    tiers: values.tiers.map((tier) => ({
      from: quotaBased ? toBps(tier.from) : majorToMinor(Number(tier.from), currency),
      rateBps: toBps(tier.ratePercent),
    })),
    accelerators: values.accelerators.map((accelerator) => ({
      aboveBps: toBps(accelerator.abovePercent),
      multiplierBps: Math.round(Number(accelerator.multiplier) * BPS_SCALE),
    })),
  };
}

export function fromRuleSet(rules: CommissionRuleSet, currency: string): RuleSetFormValues {
  const quotaBased = rules.quotaMinor !== null;
  return {
    period: rules.period,
    quota: rules.quotaMinor === null ? "" : String(minorToMajor(rules.quotaMinor, currency)),
    cap: rules.capMinor === null ? "" : String(minorToMajor(rules.capMinor, currency)),
    tiers: rules.tiers.map((tier) => ({
      from: quotaBased ? fromBps(tier.from) : String(minorToMajor(tier.from, currency)),
      ratePercent: fromBps(tier.rateBps),
    })),
    accelerators: rules.accelerators.map((accelerator) => ({
      abovePercent: fromBps(accelerator.aboveBps),
      multiplier: String(accelerator.multiplierBps / BPS_SCALE),
    })),
  };
}

export const commissionPlanFormSchema = z
  .object({
    kind: z.enum(["plan", "version"]),
    name: z.string().trim().max(200),
    description: z.string().trim().max(2000),
    currency: z.string().trim().toUpperCase(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date it takes effect"),
    note: z.string().trim().max(2000),
    rules: ruleSetFormSchema,
  })
  .superRefine((value, ctx) => {
    if (value.kind !== "plan") return;
    if (value.name === "") ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" });
    if (!/^[A-Z]{3}$/.test(value.currency))
      ctx.addIssue({ code: "custom", path: ["currency"], message: "A three-letter currency code" });
  });

export type CommissionPlanFormValues = z.infer<typeof commissionPlanFormSchema>;
