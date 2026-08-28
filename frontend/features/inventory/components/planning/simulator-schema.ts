import { z } from "zod";
import type { SimulateInput, SimulationScenarioInput } from "@/hooks/api/inventory/planning";

export const MAX_SCENARIOS = 20;

const scenarioShape = z.object({
  label: z.string().min(1, "Name this scenario").max(100, "Keep the name under 100 characters"),
  demandMultiplier: z.string(),
  leadTimeWeeks: z.string(),
  leadTimeStdDevWeeks: z.string(),
  serviceLevelPercent: z.string(),
});

const baseShape = z.object({
  serviceLevelPercent: z.string(),
  scenarios: z.array(scenarioShape).min(1, "Add at least one scenario").max(MAX_SCENARIOS),
});

interface Bound {
  min: number;
  max: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  message: string;
}

const BOUNDS: Readonly<Record<string, Bound>> = {
  demandMultiplier: {
    min: 0,
    max: 100,
    exclusiveMin: true,
    message: "Demand multiplier must be above 0 and at most 100",
  },
  leadTimeWeeks: { min: 0, max: 520, message: "Lead time must be between 0 and 520 weeks" },
  leadTimeStdDevWeeks: {
    min: 0,
    max: 520,
    message: "Lead-time deviation must be between 0 and 520 weeks",
  },
  serviceLevelPercent: {
    min: 0,
    max: 100,
    exclusiveMin: true,
    exclusiveMax: true,
    message: "Service level must be above 0% and below 100%",
  },
};

function outOfBounds(raw: string, bound: Bound): string | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return bound.message;
  if (bound.exclusiveMin ? value <= bound.min : value < bound.min) return bound.message;
  if (bound.exclusiveMax ? value >= bound.max : value > bound.max) return bound.message;
  return null;
}

export const simulatorSchema = baseShape.superRefine((values, ctx) => {
  const topLevel = outOfBounds(values.serviceLevelPercent, BOUNDS.serviceLevelPercent);
  if (topLevel)
    ctx.addIssue({ code: "custom", message: topLevel, path: ["serviceLevelPercent"] });

  values.scenarios.forEach((scenario, index) => {
    for (const field of [
      "demandMultiplier",
      "leadTimeWeeks",
      "leadTimeStdDevWeeks",
      "serviceLevelPercent",
    ] as const) {
      const bound = BOUNDS[field];
      if (!bound) continue;
      const message = outOfBounds(scenario[field], bound);
      if (message)
        ctx.addIssue({ code: "custom", message, path: ["scenarios", index, field] });
    }
  });
});

export type SimulatorFormValues = z.infer<typeof simulatorSchema>;
export type SimulatorScenarioValues = SimulatorFormValues["scenarios"][number];

function optionalNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function optionalFraction(raw: string): number | undefined {
  const percent = optionalNumber(raw);
  return percent === undefined ? undefined : percent / 100;
}

export function emptyScenario(label: string): SimulatorScenarioValues {
  return {
    label,
    demandMultiplier: "",
    leadTimeWeeks: "",
    leadTimeStdDevWeeks: "",
    serviceLevelPercent: "",
  };
}

export const DEFAULT_SIMULATOR_VALUES: SimulatorFormValues = {
  serviceLevelPercent: "",
  scenarios: [
    { ...emptyScenario("Demand +20%"), demandMultiplier: "1.2" },
    { ...emptyScenario("Lead time 3 weeks"), leadTimeWeeks: "3" },
  ],
};

export function toSimulateInput(
  productVariantId: number,
  values: SimulatorFormValues,
): SimulateInput {
  const scenarios: SimulationScenarioInput[] = values.scenarios.map((scenario) => {
    const demandMultiplier = optionalNumber(scenario.demandMultiplier);
    const leadTimeWeeks = optionalNumber(scenario.leadTimeWeeks);
    const leadTimeStdDevWeeks = optionalNumber(scenario.leadTimeStdDevWeeks);
    const serviceLevel = optionalFraction(scenario.serviceLevelPercent);
    return {
      label: scenario.label,
      ...(demandMultiplier !== undefined ? { demandMultiplier } : {}),
      ...(leadTimeWeeks !== undefined ? { leadTimeWeeks } : {}),
      ...(leadTimeStdDevWeeks !== undefined ? { leadTimeStdDevWeeks } : {}),
      ...(serviceLevel !== undefined ? { serviceLevel } : {}),
    };
  });

  const serviceLevel = optionalFraction(values.serviceLevelPercent);
  return {
    productVariantId,
    scenarios,
    ...(serviceLevel !== undefined ? { serviceLevel } : {}),
  };
}
