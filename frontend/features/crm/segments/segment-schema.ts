import { z } from "zod";
import {
  REPORTING_COMPARISON_OPERATORS,
  REPORTING_FIELD_TYPES,
} from "@/types/crm/reporting";
import {
  SEGMENT_OPERATORS_FOR_TYPE,
  segmentOperatorArity,
  splitCriterionValues,
  toScalar,
} from "./segment-criteria";

/**
 * What the builder lets somebody assemble, and nothing the compiler would then
 * refuse.
 *
 * Every bound here is the server's, restated so the refusal arrives on the
 * control that caused it rather than as a 400 after they pressed Save. The
 * server re-checks all of it — `compileQuery` re-validates a stored tree on
 * every evaluation — so this is an ergonomic gate, not a security one, and it
 * must never be mistaken for the second.
 */

/**
 * `MAX_BRANCHES` in `dto/reporting.schemas.ts`.
 *
 * The children of one `and` are capped at twenty independently of the node
 * budget, and this builder emits exactly one flat `and`, so twenty — not the
 * hundred-node cap — is the number of criteria a segment may carry.
 */
export const MAX_SEGMENT_CRITERIA = 20;

/** `QUERY_LIMITS.maxInValues` and `maxValueLength` in `query-description.ts`. */
const MAX_LIST_VALUES = 200;
const MAX_VALUE_LENGTH = 1000;

const criterionRowSchema = z.object({
  field: z.string(),
  fieldType: z.union([z.literal(""), z.enum(REPORTING_FIELD_TYPES)]),
  operator: z.enum(REPORTING_COMPARISON_OPERATORS),
  value: z.string(),
  values: z.string(),
});

const baseSchema = z.object({
  name: z.string().trim().min(1, "Give the segment a name").max(200, "At most 200 characters"),
  description: z.string().max(2000, "At most 2000 characters"),
  source: z.string().min(1, "Pick what to segment"),
  criteria: z
    .array(criterionRowSchema)
    .min(1, "A segment needs at least one criterion — without any it is the whole list")
    .max(MAX_SEGMENT_CRITERIA, `At most ${MAX_SEGMENT_CRITERIA} criteria`),
});

export type SegmentFormValues = z.infer<typeof baseSchema>;
export type SegmentCriterionRowValues = z.infer<typeof criterionRowSchema>;

function checkValue(
  row: SegmentCriterionRowValues,
  index: number,
  ctx: z.RefinementCtx,
): void {
  if (row.fieldType === "") return;
  const arity = segmentOperatorArity(row.operator);
  const path = ["criteria", index] as const;

  if (arity === "unary") return;

  if (arity === "binary") {
    if (row.value.trim().length > MAX_VALUE_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `At most ${MAX_VALUE_LENGTH} characters`,
        path: [...path, "value"],
      });
      return;
    }
    if (toScalar(row.value, row.fieldType) === null)
      ctx.addIssue({
        code: "custom",
        message: valueProblem(row.fieldType),
        path: [...path, "value"],
      });
    return;
  }

  const entries = splitCriterionValues(row.values);
  if (entries.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Add at least one value, one per line",
      path: [...path, "values"],
    });
    return;
  }
  if (entries.length > MAX_LIST_VALUES) {
    ctx.addIssue({
      code: "custom",
      message: `At most ${MAX_LIST_VALUES} values`,
      path: [...path, "values"],
    });
    return;
  }
  const fieldType = row.fieldType;
  if (entries.some((entry) => toScalar(entry, fieldType) === null))
    ctx.addIssue({
      code: "custom",
      message: valueProblem(fieldType),
      path: [...path, "values"],
    });
}

function valueProblem(fieldType: SegmentCriterionRowValues["fieldType"]): string {
  if (fieldType === "number") return "Enter a number";
  if (fieldType === "boolean") return "Choose true or false";
  if (fieldType === "date" || fieldType === "timestamp") return "Enter a date";
  return "A value is required";
}

export const segmentFormSchema = baseSchema.superRefine((values, ctx) => {
  values.criteria.forEach((row, index) => {
    const path = ["criteria", index] as const;
    if (row.field === "" || row.fieldType === "") {
      ctx.addIssue({ code: "custom", message: "Pick a field", path: [...path, "field"] });
      return;
    }
    if (!SEGMENT_OPERATORS_FOR_TYPE[row.fieldType].includes(row.operator)) {
      /**
       * Reachable by changing the field after choosing the operator. The control
       * resets the operator when the type changes, so this is the belt on top of
       * that — and it is what stops a description the compiler would refuse from
       * ever being sent.
       */
      ctx.addIssue({
        code: "custom",
        message: "That comparison does not apply to this field",
        path: [...path, "operator"],
      });
      return;
    }
    checkValue(row, index, ctx);
  });
});
