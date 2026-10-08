import { z } from "zod";
import type { AllWorkFilters, AllWorkTicket } from "@/types/projects";

const filtersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  assigneeId: z.string().optional(),
  labelIds: z.string().optional(),
  cycleId: z.string().optional(),
  epicId: z.number().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  orderBy: z
    .enum(["created", "updated", "priority", "dueDate", "rank"])
    .optional(),
  orderDir: z.enum(["asc", "desc"]).optional(),
  projectIds: z.string().optional(),
  excludeStatus: z.string().optional(),
  scope: z
    .enum([
      "all",
      "mine",
      "created",
      "subscribed",
      "mentioned",
      "blocked",
      "recently-completed",
    ])
    .optional(),
  teamId: z.number().optional(),
  managedProductId: z.number().optional(),
  blockedOnly: z.boolean().optional(),
  includeTotal: z.boolean().optional(),
});

export function filtersForKey(key: readonly unknown[]): AllWorkFilters {
  const marker = key.lastIndexOf("all-work");
  const parsed = filtersSchema.safeParse(key[marker + 1]);
  return parsed.success ? parsed.data : {};
}

function values(value: string | undefined): Set<string> | null {
  return value
    ? new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      )
    : null;
}

export function matchesSafeFilters(
  ticket: AllWorkTicket,
  filters: AllWorkFilters,
): boolean {
  const statuses = values(filters.status);
  const excludedStatuses = values(filters.excludeStatus);
  const priorities = values(filters.priority);
  const types = values(filters.type);
  const projects = values(filters.projectIds);
  if (statuses && !statuses.has(ticket.status)) return false;
  if (excludedStatuses?.has(ticket.status)) return false;
  if (priorities && !priorities.has(ticket.priority ?? "")) return false;
  if (types && !types.has(ticket.type)) return false;
  if (projects && !projects.has(String(ticket.projectId))) return false;
  if (filters.epicId !== undefined && ticket.epicId !== filters.epicId)
    return false;
  if (
    filters.dueDateFrom &&
    (!ticket.dueDate || ticket.dueDate < filters.dueDateFrom)
  )
    return false;
  if (
    filters.dueDateTo &&
    (!ticket.dueDate || ticket.dueDate > filters.dueDateTo)
  )
    return false;
  return true;
}

export function relevantServerPredicateChanged(
  filters: AllWorkFilters,
  pairs: { before: AllWorkTicket; after: AllWorkTicket }[],
): boolean {
  return pairs.some(({ before, after }) =>
    Boolean(
      (filters.search && before.title !== after.title) ||
      (filters.assigneeId && before.assigneeId !== after.assigneeId) ||
      (filters.cycleId && before.cycleId !== after.cycleId) ||
      (filters.scope === "mine" && before.assigneeId !== after.assigneeId) ||
      (filters.scope === "recently-completed" &&
        before.status !== after.status),
    ),
  );
}

export function orderChanged(
  filters: AllWorkFilters,
  pairs: { before: AllWorkTicket; after: AllWorkTicket }[],
): boolean {
  if (!filters.orderBy) return false;
  return pairs.some(({ before, after }) => {
    if (filters.orderBy === "updated")
      return before.updatedAt !== after.updatedAt;
    if (filters.orderBy === "priority")
      return before.priority !== after.priority;
    if (filters.orderBy === "dueDate") return before.dueDate !== after.dueDate;
    if (filters.orderBy === "rank") return before.rank !== after.rank;
    return before.createdAt !== after.createdAt;
  });
}

export function allWorkFamily(
  key: readonly unknown[],
  filters: AllWorkFilters,
): string {
  const parsed = filtersSchema.parse(filters);
  delete parsed.status;
  delete parsed.cursor;
  return JSON.stringify({
    kind: key[key.length - 1] === "infinite" ? "infinite" : "finite",
    statusFiltered: filters.status !== undefined,
    filters: parsed,
  });
}
