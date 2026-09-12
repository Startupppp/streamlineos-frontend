export interface AuditEvent {
  id: number;
  actorMembershipId: number | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

export function auditActorLabel(event: Pick<AuditEvent, "actorMembershipId" | "actorName">): string {
  if (event.actorName) return event.actorName;
  return event.actorMembershipId === null ? "System" : "Former member";
}
