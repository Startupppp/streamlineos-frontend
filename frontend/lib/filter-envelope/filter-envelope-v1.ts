import { z } from "zod";

export const MAX_FILTER_CLAUSES = 20;
export const MAX_FILTER_DEPTH = 2;

export const FILTER_OPERATORS = [
  "is",
  "is-not",
  "before",
  "after",
  "contains",
  "contains-any",
  "contains-none",
  "between",
  "gt",
  "lt",
  "is-empty",
  "is-not-empty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const TICKET_FILTER_FIELDS = [
  "status",
  "priority",
  "type",
  "assigneeId",
  "reporterId",
  "labels",
  "projectId",
  "cycleId",
  "epicId",
  "moduleId",
  "dueDate",
  "startDate",
  "createdAt",
  "updatedAt",
  "estimate",
  "points",
] as const;

export const PROJECT_FILTER_FIELDS = [
  "status",
  "ownerId",
  "labels",
  "createdAt",
  "updatedAt",
  "startDate",
  "dueDate",
] as const;

export const PERSON_FILTER_FIELDS = [
  "role",
  "department",
  "managerId",
  "status",
  "hireDate",
] as const;

export const CLIENT_FILTER_FIELDS = [
  "status",
  "industryId",
  "ownerId",
  "createdAt",
] as const;

export type FilterContext = "ticket" | "project" | "person" | "client";

export const AUTHORIZED_FIELDS: Record<FilterContext, readonly string[]> = {
  ticket: TICKET_FILTER_FIELDS,
  project: PROJECT_FILTER_FIELDS,
  person: PERSON_FILTER_FIELDS,
  client: CLIENT_FILTER_FIELDS,
};

const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number()])),
]);

export type FilterValue = z.infer<typeof filterValueSchema>;

const filterClauseSchema = z
  .object({
    field: z.string().min(1).max(100),
    op: z.enum(FILTER_OPERATORS),
    value: filterValueSchema,
  })
  .strict();

export type FilterClause = z.infer<typeof filterClauseSchema>;

const filterGroupSchema = z
  .object({
    logic: z.enum(["and", "or"]),
    filters: z
      .array(filterClauseSchema)
      .min(1)
      .max(MAX_FILTER_CLAUSES),
  })
  .strict();

export type FilterGroup = z.infer<typeof filterGroupSchema>;

const filterEnvelopeV1Schema = z
  .object({
    version: z.literal(1),
    logic: z.enum(["and", "or"]),
    filters: z
      .array(z.union([filterClauseSchema, filterGroupSchema]))
      .min(0)
      .max(MAX_FILTER_CLAUSES),
  })
  .strict();

export type FilterEnvelopeV1 = z.infer<typeof filterEnvelopeV1Schema>;

export function parseFilterEnvelope(input: unknown): FilterEnvelopeV1 | null {
  const result = filterEnvelopeV1Schema.safeParse(input);
  if (!result.success) return null;
  return result.data;
}

export function isFilterClause(
  item: FilterClause | FilterGroup,
): item is FilterClause {
  return "field" in item && "op" in item;
}

export function isFilterGroup(
  item: FilterClause | FilterGroup,
): item is FilterGroup {
  return "filters" in item;
}

export function encodeFilterEnvelope(envelope: FilterEnvelopeV1): string {
  return btoa(
    encodeURIComponent(JSON.stringify(envelope)).replace(
      /%([0-9A-F]{2})/g,
      (_, p1: string) => String.fromCharCode(parseInt(p1, 16)),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeFilterEnvelope(encoded: string): FilterEnvelopeV1 | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return parseFilterEnvelope(JSON.parse(json));
  } catch {
    return null;
  }
}

export function countFilterClauses(
  filters: Array<FilterClause | FilterGroup>,
): number {
  let count = 0;
  for (const item of filters) {
    if (isFilterClause(item)) {
      count += 1;
    } else {
      count += item.filters.length;
    }
  }
  return count;
}

export function validateFilterEnvelopeForContext(
  envelope: FilterEnvelopeV1,
  context: FilterContext,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const authorized = new Set(AUTHORIZED_FIELDS[context]);
  const total = countFilterClauses(envelope.filters);

  if (total > MAX_FILTER_CLAUSES) {
    errors.push(
      `Filter clause count ${total} exceeds maximum ${MAX_FILTER_CLAUSES}`,
    );
  }

  for (const item of envelope.filters) {
    if (isFilterClause(item)) {
      if (!authorized.has(item.field)) {
        errors.push(`Unauthorized field '${item.field}' for context '${context}'`);
      }
    } else {
      for (const clause of item.filters) {
        if (!authorized.has(clause.field)) {
          errors.push(
            `Unauthorized field '${clause.field}' for context '${context}'`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildEmptyEnvelope(
  logic: "and" | "or" = "and",
): FilterEnvelopeV1 {
  return { version: 1, logic, filters: [] };
}

export function addClause(
  envelope: FilterEnvelopeV1,
  clause: FilterClause,
): FilterEnvelopeV1 {
  return { ...envelope, filters: [...envelope.filters, clause] };
}

export function removeClauseAtIndex(
  envelope: FilterEnvelopeV1,
  index: number,
): FilterEnvelopeV1 {
  return {
    ...envelope,
    filters: envelope.filters.filter((_, i) => i !== index),
  };
}

export { filterEnvelopeV1Schema };
