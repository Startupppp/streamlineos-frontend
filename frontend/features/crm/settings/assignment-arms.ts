import type {
  AssignmentRule,
  AssignmentRuleConfig,
  AssignmentType,
  BaseAssignmentType,
  CreateAssignmentRuleInput,
  WeightedMember,
} from "@/hooks/api/crm/settings/assignment-rules";

export const BASE_ASSIGNMENT_TYPES = ["assign_user", "round_robin"] as const;

export const ASSIGNMENT_TYPES = [
  "assign_user",
  "round_robin",
  "weighted_round_robin",
  "least_loaded",
  "territory",
] as const;

export const MEMBER_LIST_ARMS: readonly AssignmentType[] = [
  "round_robin",
  "weighted_round_robin",
  "least_loaded",
];

export function asAssignmentType(value: string | undefined): AssignmentType {
  return ASSIGNMENT_TYPES.find((candidate) => candidate === value) ?? "assign_user";
}

export function baseTypeFor(type: AssignmentType): BaseAssignmentType {
  return type === "assign_user" ? "assign_user" : "round_robin";
}

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
