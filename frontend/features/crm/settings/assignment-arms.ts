import type {
  AssignmentRule,
  AssignmentRuleConfig,
  AssignmentType,
  BaseAssignmentType,
  CreateAssignmentRuleInput,
  WeightedMember,
} from "@/hooks/api/crm-settings";

/**
 * How the five arms this screen offers map onto the two columns that store
 * them, mirrored from `crm-rules.service.ts` and `rules.schemas.ts`.
 *
 * The screen and the API disagreed about this completely. The picker offered
 * five types and sent the chosen one as `assignmentType`, whose Zod enum admits
 * two; the per-arm data went as `weightedMembers`, `windowHours` and
 * `territoryId`, none of which is a column, against a `.strict()` schema. So
 * three of the five options could not be saved at all, and because the schema
 * answers a rejected enum and an unknown key the same way, the whole thing
 * arrived as `Validation failed.` with nothing to act on.
 *
 * `assignment-arms.test.ts` reads both enums and the config keys out of the
 * backend's own schema file so the two cannot part company again.
 */
export const BASE_ASSIGNMENT_TYPES = ["assign_user", "round_robin"] as const;

export const ASSIGNMENT_TYPES = [
  "assign_user",
  "round_robin",
  "weighted_round_robin",
  "least_loaded",
  "territory",
] as const;

/** Arms whose candidates the server reads out of `roundRobinUserIds`. */
export const MEMBER_LIST_ARMS: readonly AssignmentType[] = [
  "round_robin",
  "weighted_round_robin",
  "least_loaded",
];

export function asAssignmentType(value: string | undefined): AssignmentType {
  return ASSIGNMENT_TYPES.find((candidate) => candidate === value) ?? "assign_user";
}

/**
 * The value the `assignment_type` column takes.
 *
 * Everything but a single named assignee is a round robin at heart -- weighted
 * picks from the same pool, least-loaded counts across it -- so the base is
 * `round_robin` and `assignmentTypeText` carries which of them it is.
 */
export function baseTypeFor(type: AssignmentType): BaseAssignmentType {
  return type === "assign_user" ? "assign_user" : "round_robin";
}

/** What the rule does, read the way `resolveAssignment` reads it. */
export function effectiveTypeOf(
  rule: Pick<AssignmentRule, "assignmentType" | "assignmentTypeText">,
): AssignmentType {
  return rule.assignmentTypeText ?? rule.assignmentType;
}

export function weightsFrom(members: readonly WeightedMember[]): Record<string, number> {
  return Object.fromEntries(members.map((member) => [member.userId, member.weight]));
}

export function membersFrom(config: AssignmentRuleConfig | null): WeightedMember[] {
  return Object.entries(config?.weights ?? {}).map(([userId, weight]) => ({ userId, weight }));
}

export interface ArmInput {
  assignToUserId: string | undefined;
  members: string[];
  weighted: WeightedMember[];
  fallbackUserId: string | undefined;
}

/**
 * The arm's own half of the payload, in the shape the API stores.
 *
 * `assignmentTypeText` is sent on every arm, never omitted. `updateAssignmentRule`
 * treats an absent one as "leave it alone", so switching a weighted rule back to
 * a plain round robin by omission would keep on weighting it.
 */
export function armPayload(
  type: AssignmentType,
  input: ArmInput,
): Pick<
  CreateAssignmentRuleInput,
  "assignmentType" | "assignmentTypeText" | "assignToUserId" | "roundRobinUserIds" | "config"
> {
  const base = {
    assignmentType: baseTypeFor(type),
    assignmentTypeText: type,
  };

  if (type === "assign_user")
    return { ...base, assignToUserId: input.assignToUserId, config: {} };

  if (type === "weighted_round_robin")
    return {
      ...base,
      // Doubles as the fallback pool: with no weights recorded the server
      // reaches for `roundRobinUserIds[0]` rather than assigning nobody.
      roundRobinUserIds: input.weighted.map((member) => member.userId),
      config: { weights: weightsFrom(input.weighted) },
    };

  if (type === "territory")
    return {
      ...base,
      config: input.fallbackUserId === undefined ? {} : { fallbackUserId: input.fallbackUserId },
    };

  return { ...base, roundRobinUserIds: input.members, config: {} };
}
