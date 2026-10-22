import type { PermissionKey } from "@/lib/rbac/permissions";
import type { PlannedEntity } from "@/types/crm/import";

export type { PlannedEntity };

export interface PlannedEntityDescriptor {
  id: PlannedEntity;
  label: string;
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
  return PLANNED_ENTITIES.find((entity) => entity.id === id) ?? PLANNED_ENTITIES[0];
}

export function needsSubjectType(id: PlannedEntity): boolean {
  return id === "subject";
}
