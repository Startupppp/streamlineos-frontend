import type { Incident } from "@/types/projects";

export interface SlaState {
  responseBreached: boolean;
  resolutionBreached: boolean;
  label: "On track" | "Response breached" | "Resolution breached" | "Met";
}

function isLate(dueAtIso: string, atIso: string | Date): boolean {
  const due = new Date(dueAtIso).getTime();
  const at = typeof atIso === "string" ? new Date(atIso).getTime() : atIso.getTime();
  if (Number.isNaN(due) || Number.isNaN(at)) return false;
  return due < at;
}

export function getSlaState(incident: Incident, now?: Date): SlaState {
  const t = now ?? new Date();

  const responseBreached =
    incident.responseDueAt != null &&
    isLate(incident.responseDueAt, incident.respondedAt ?? t);

  const resolutionBreached =
    incident.resolutionDueAt != null &&
    isLate(incident.resolutionDueAt, incident.resolvedAt ?? t);

  let label: SlaState["label"];
  if (responseBreached) {
    label = "Response breached";
  } else if (resolutionBreached) {
    label = "Resolution breached";
  } else if (incident.resolvedAt != null) {
    label = "Met";
  } else {
    label = "On track";
  }

  return { responseBreached, resolutionBreached, label };
}
