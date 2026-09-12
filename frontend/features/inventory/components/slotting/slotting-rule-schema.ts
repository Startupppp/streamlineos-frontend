import { z } from "zod";
import { isLocationType } from "@/features/inventory/components/warehouse/location-type-constants";
import type {
  CreateSlottingRuleInput,
  VelocityClass,
} from "@/hooks/api/inventory/slotting-labor";

export const SLOTTING_MATCH_TYPES = ["VELOCITY_CLASS", "CATEGORY", "PRODUCT_VARIANT"] as const;

type SlottingMatch = (typeof SLOTTING_MATCH_TYPES)[number];

export const SLOTTING_MATCH_TYPE_LABEL: Record<SlottingMatch, string> = {
  VELOCITY_CLASS: "A velocity class",
  CATEGORY: "A category",
  PRODUCT_VARIANT: "One variant",
};

export const VELOCITY_CLASSES = ["A", "B", "C"] as const;

export const VELOCITY_CLASS_LABEL: Record<VelocityClass, string> = {
  A: "A — the fastest movers",
  B: "B — steady movers",
  C: "C — the slow tail",
};

/** The sentinel for "anywhere under the zone", which is what omitting the field means. */
export const ANY_LOCATION_TYPE = "ANY";

/** Which form field carries each match type's payload, and what to call it in prose. */
const PAYLOAD_FIELD: Record<SlottingMatch, "velocityClass" | "categoryId" | "productVariantId"> = {
  VELOCITY_CLASS: "velocityClass",
  CATEGORY: "categoryId",
  PRODUCT_VARIANT: "productVariantId",
};

const PAYLOAD_NOUN = {
  velocityClass: "velocity class",
  categoryId: "category",
  productVariantId: "variant",
} as const;

const MATCH_NOUN: Record<SlottingMatch, string> = {
  VELOCITY_CLASS: "velocity-class",
  CATEGORY: "category",
  PRODUCT_VARIANT: "variant",
};

/**
 * Mirrors the backend's `createSlottingRuleSchema`, cross-field rule included.
 *
 * The `superRefine` there enforces that the discriminator and its payload move
 * together — a `VELOCITY_CLASS` rule must name a class and must not also name a
 * category or a variant. Reproducing it here is not belt-and-braces politeness:
 * a per-field `optional()` would let "fastest movers, and also category 12"
 * reach the API and come back a 400 naming a field the planner never knowingly
 * filled in. The fields form clears the other two payloads when the match type
 * changes, so the exclusivity branch below should be unreachable through the UI
 * — it is the assertion that the clearing is actually happening.
 *
 * Ids and the priority are strings all the way through the form because that is
 * what a `Select` and an `<input>` hold; they become numbers once, at the
 * boundary in `toCreateSlottingRulePayload`.
 */
export const slottingRuleFormSchema = z
  .object({
    warehouseId: z.string().min(1, "Choose the warehouse this rule governs"),
    name: z.string().trim().min(1, "A name is required").max(120),
    matchType: z.enum(SLOTTING_MATCH_TYPES),
    velocityClass: z.string(),
    categoryId: z.string(),
    productVariantId: z.string(),
    targetZoneLocationId: z.string().min(1, "Choose the zone this rule sends stock to"),
    targetLocationType: z.string(),
    priority: z.string(),
  })
  .superRefine((values, ctx) => {
    const required = PAYLOAD_FIELD[values.matchType];
    if (!values[required])
      ctx.addIssue({
        code: "custom",
        path: [required],
        message: `Choose the ${PAYLOAD_NOUN[required]} this rule matches`,
      });

    for (const matchType of SLOTTING_MATCH_TYPES) {
      const field = PAYLOAD_FIELD[matchType];
      if (matchType === values.matchType || !values[field]) continue;
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `A ${MATCH_NOUN[values.matchType]} rule must not also name a ${PAYLOAD_NOUN[field]}`,
      });
    }

    const priority = values.priority.trim();
    if (!/^\d+$/.test(priority)) {
      ctx.addIssue({ code: "custom", path: ["priority"], message: "Enter a whole number" });
      return;
    }
    if (Number(priority) > 10_000)
      ctx.addIssue({ code: "custom", path: ["priority"], message: "The highest priority is 10000" });
  });

export type SlottingRuleFormValues = z.infer<typeof slottingRuleFormSchema>;

export const SLOTTING_RULE_FORM_DEFAULTS: SlottingRuleFormValues = {
  warehouseId: "",
  name: "",
  matchType: "VELOCITY_CLASS",
  velocityClass: "",
  categoryId: "",
  productVariantId: "",
  targetZoneLocationId: "",
  targetLocationType: ANY_LOCATION_TYPE,
  priority: "100",
};

function toVelocityClass(value: string): VelocityClass | undefined {
  return value === "A" || value === "B" || value === "C" ? value : undefined;
}

/**
 * The one place strings become the numbers the `.strict()` body wants.
 *
 * Only the payload the chosen match type owns is spread in, so a form state that
 * somehow held two of them still could not send two.
 */
export function toCreateSlottingRulePayload(
  values: SlottingRuleFormValues,
): CreateSlottingRuleInput {
  const velocityClass = toVelocityClass(values.velocityClass);
  const match =
    values.matchType === "VELOCITY_CLASS"
      ? velocityClass
        ? { velocityClass }
        : {}
      : values.matchType === "CATEGORY"
        ? { categoryId: Number(values.categoryId) }
        : { productVariantId: Number(values.productVariantId) };

  return {
    warehouseId: Number(values.warehouseId),
    name: values.name.trim(),
    matchType: values.matchType,
    ...match,
    targetZoneLocationId: Number(values.targetZoneLocationId),
    ...(isLocationType(values.targetLocationType)
      ? { targetLocationType: values.targetLocationType }
      : {}),
    priority: Number(values.priority.trim()),
  };
}
