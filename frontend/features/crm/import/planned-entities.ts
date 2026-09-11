import type { PermissionKey } from "@/lib/rbac/permissions";
import type { PlannedEntity } from "@/types/crm/import";

/**
 * What a planned import can land a file on.
 *
 * These four go through the server-side planner: every row is decided before
 * anything is written, the commit runs as a durable job and the whole thing can
 * be taken back afterwards. Leads, contacts and deals also have a plain bulk
 * import on this page — see `bulk-import-entities.ts` — and the overlap on
 * deals is real rather than accidental: the bulk path carries an owner and a
 * contact address that the planner has no field for, and the planner carries a
 * probability and a next step the bulk path has none of. Neither is a superset,
 * so neither can absorb the other yet. Recorded here so the next session reads
 * it as a known duplicate to resolve rather than a mistake to repeat.
 *
 * The key is the one the server checks for that entity on top of
 * `crm:imports:manage`, so the control is hidden for exactly the same reason
 * the request would be refused.
 */
export type { PlannedEntity };

export interface PlannedEntityDescriptor {
  id: PlannedEntity;
  label: string;
  /** What a file of this kind is, in the words of somebody holding one. */
  hint: string;
  permission: PermissionKey;
}

export const PLANNED_ENTITIES: readonly PlannedEntityDescriptor[] = [
  {
    id: "party",
    label: "Companies and people",
    hint: "A contacts, accounts or leads export. Rows are the customers themselves.",
    permission: "party:parties:create",
  },
  {
    id: "subject",
    label: "Subjects",
    hint: "The records your organisation declared its own type for — a property, a policy, a vehicle.",
    permission: "party:subjects:manage",
  },
  {
    id: "pipeline",
    label: "Deals",
    hint: "A deals or opportunities export. Rows are deals sitting in a pipeline stage.",
    permission: "crm:deals:create",
  },
  {
    id: "activity",
    label: "Activities",
    hint: "Calls, emails, meetings, notes and tasks that already happened.",
    permission: "crm:activities:manage",
  },
];

export function plannedEntity(id: PlannedEntity): PlannedEntityDescriptor {
  // Every id in the union is declared above; typed as non-optional so callers
  // do not each handle a case that cannot happen.
  return PLANNED_ENTITIES.find((entity) => entity.id === id) ?? PLANNED_ENTITIES[0];
}

/** A subject import cannot be planned without knowing which declaration it is. */
export function needsSubjectType(id: PlannedEntity): boolean {
  return id === "subject";
}
