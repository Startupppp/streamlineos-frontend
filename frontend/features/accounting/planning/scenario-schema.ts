import { z } from "zod";

/**
 * The planning-scenario form contract and its create defaults.
 */

export const scenarioSchema = z.object({
  name: z.string().min(1, "Name required"),
  kind: z.enum(["CONSERVATIVE", "EXPECTED", "AGGRESSIVE", "CUSTOM"]),
  isDefault: z.boolean(),
  collectionRatePct: z.number().min(0).max(100),
  payDelayDays: z.number().int().min(0).max(90),
  revenueGrowthPct: z.number().min(-100).max(500),
  plannedSpend: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.number().min(0),
      startWeek: z.number().int().min(0).max(51),
      recurringWeekly: z.boolean(),
    }),
  ),
});

export type ScenarioForm = z.infer<typeof scenarioSchema>;

export const CREATE_DEFAULTS: ScenarioForm = {
  name: "",
  kind: "EXPECTED",
  isDefault: false,
  collectionRatePct: 100,
  payDelayDays: 7,
  revenueGrowthPct: 0,
  plannedSpend: [],
};
