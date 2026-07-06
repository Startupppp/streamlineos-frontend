import type { Incident } from "@/types/projects";

export interface SlaState {
  responseBreached: boolean;
  resolutionBreached: boolean;
  label: "On track" | "Response breached" | "Resolution breached" | "Met";
}

export function getSlaState(incident: Incident, now?: Date): SlaState {
  const t = now ?? new Date();

  const responseBreached =
    incident.respondedAt == null &&
    incident.responseDueAt != null &&
    new Date(incident.responseDueAt) < t;

  const resolutionBreached =
    incident.resolvedAt == null &&
    incident.resolutionDueAt != null &&
    new Date(incident.resolutionDueAt) < t;

  let label: SlaState["label"];
  if (incident.resolvedAt != null) {
    label = "Met";
  } else if (responseBreached) {
    label = "Response breached";
  } else if (resolutionBreached) {
    label = "Resolution breached";
  } else {
    label = "On track";
  }

  return { responseBreached, resolutionBreached, label };
}
